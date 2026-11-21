param([Parameter(Mandatory=$true)][string]$Ffmpeg, [int]$Limit = 0, [int]$Shard = 0, [int]$Shards = 1)
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$renderRoot = [IO.Path]::GetFullPath((Join-Path $projectRoot '.cache/rendered'))
$audioRoot = Join-Path $projectRoot 'static/audio/chapters'
New-Item -ItemType Directory -Force -Path $audioRoot | Out-Null
Add-Type -AssemblyName System.Speech
Add-Type -ReferencedAssemblies System.Speech,System.Xml -TypeDefinition @'
using System;
using System.IO;
using System.Collections.Generic;
using System.Speech.Synthesis;
using System.Speech.AudioFormat;
public class RenderResult {
  public Dictionary<string,double> Marks = new Dictionary<string,double>();
  public double Duration;
}
public static class BibleSpeechRenderer {
  private static void Append(SpeechSynthesizer voice,string fragment,BinaryWriter output) {
    using(var memory = new MemoryStream()) {
      voice.SetOutputToAudioStream(memory,new SpeechAudioFormatInfo(16000,AudioBitsPerSample.Sixteen,AudioChannel.Mono));
      voice.SpeakSsml("<speak version=\"1.0\" xmlns=\"http://www.w3.org/2001/10/synthesis\" xml:lang=\"en-US\">"+fragment+"</speak>");
      voice.SetOutputToNull();
      output.Write(memory.ToArray());
    }
  }
  public static RenderResult Render(string ssml,string destination) {
    var result = new RenderResult();
    var document = new System.Xml.XmlDocument();document.LoadXml(ssml);
    using(var output = new BinaryWriter(File.Create(destination)))
    using(var voice = new SpeechSynthesizer()) {
      output.Write(System.Text.Encoding.ASCII.GetBytes("RIFF"));output.Write(0);output.Write(System.Text.Encoding.ASCII.GetBytes("WAVEfmt "));output.Write(16);output.Write((short)1);output.Write((short)1);output.Write(16000);output.Write(32000);output.Write((short)2);output.Write((short)16);output.Write(System.Text.Encoding.ASCII.GetBytes("data"));output.Write(0);
      voice.SelectVoice("Microsoft David Desktop");
      voice.Rate = 0;
      var fragment = new System.Text.StringBuilder();
      foreach(System.Xml.XmlNode node in document.DocumentElement.ChildNodes) {
        if(node.LocalName=="mark") {
          if(fragment.Length>0) {Append(voice,fragment.ToString(),output);fragment.Clear();}
          result.Marks[node.Attributes["name"].Value]=(output.BaseStream.Position-44)/32000.0;
        } else fragment.Append(node.OuterXml.Replace(" xmlns=\"http://www.w3.org/2001/10/synthesis\"",""));
      }
      if(fragment.Length>0)Append(voice,fragment.ToString(),output);
      int bytes=(int)output.BaseStream.Length-44;
      result.Duration=bytes/32000.0;output.BaseStream.Position=4;output.Write(bytes+36);output.BaseStream.Position=40;output.Write(bytes);
    }
    return result;
  }
}
'@
$allJobs = Get-Content -LiteralPath (Join-Path $projectRoot '.cache/audio-jobs.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$jobs = for($jobIndex=0;$jobIndex -lt $allJobs.Count;$jobIndex++) { if($jobIndex % $Shards -eq $Shard) {$allJobs[$jobIndex]} }
$done = 0
$started = Get-Date
foreach($job in $jobs) {
  $outputPath = Join-Path $projectRoot ('static' + $job.src.Replace('/','\'))
  $metaPath = Join-Path $renderRoot ($job.id + '.json')
  if(Test-Path -LiteralPath $metaPath) {
    $previous = Get-Content -LiteralPath $metaPath -Raw -Encoding UTF8 | ConvertFrom-Json
    $expectedCues = ([regex]::Matches($job.ssml,'<mark ')).Count - 1
    if($previous.textSha256 -eq $job.textSha256 -and $previous.cues.Count -eq $expectedCues -and (Test-Path -LiteralPath (Join-Path $projectRoot ('static' + $previous.src.Replace('/','\'))))) {continue}
  }
  $wavePath = [IO.Path]::GetFullPath((Join-Path $renderRoot ($job.id + '.wav')))
  if(-not $wavePath.StartsWith($renderRoot + [IO.Path]::DirectorySeparatorChar)) { throw 'Invalid temporary output path' }
  $render = [BibleSpeechRenderer]::Render($job.ssml,$wavePath)
  & $Ffmpeg -y -loglevel error -i $wavePath -c:a aac -b:a 24k -ar 22050 -ac 1 -movflags +faststart $outputPath
  if($LASTEXITCODE -ne 0) { throw "Encoding failed: $($job.id)" }
  $audioHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $outputPath).Hash.ToLowerInvariant()
  $finalPath = [IO.Path]::GetFullPath((Join-Path $audioRoot ($job.id + '.' + $audioHash.Substring(0,12) + '.m4a')))
  if(-not $finalPath.StartsWith([IO.Path]::GetFullPath($audioRoot) + [IO.Path]::DirectorySeparatorChar)) {throw 'Invalid final audio path'}
  Move-Item -LiteralPath $outputPath -Destination $finalPath -Force
  $finalSrc = '/audio/chapters/' + [IO.Path]::GetFileName($finalPath)
  $marks = @($render.Marks.Keys | Where-Object {$_ -ne 'end'} | Sort-Object {$render.Marks[$_]})
  $cues = for($index=0; $index -lt $marks.Count; $index++) {
    $mark = $marks[$index]
    $cueEnd = if($index+1 -lt $marks.Count) {$render.Marks[$marks[$index+1]]} else {$render.Duration}
    @{kind=$(if($mark -eq 'summary') {'summary'} else {'verse'}); verse=$(if($mark -eq 'summary') {$null} else {[int]$mark.Substring(1)}); start=$render.Marks[$mark]; end=$cueEnd}
  }
  $meta = @{src=$finalSrc; duration=$render.Duration; summaryStart=$render.Marks['summary']; cues=@($cues); textSha256=$job.textSha256; audioSha256=$audioHash; voiceLabel='Microsoft David Desktop - synthetic voice'; lastVerse=$job.lastVerse}
  [IO.File]::WriteAllText($metaPath,($meta | ConvertTo-Json -Depth 8 -Compress),[Text.UTF8Encoding]::new($false))
  Remove-Item -LiteralPath $wavePath
  $done++
  if($done % 5 -eq 0 -or $Limit -gt 0) { Write-Output "Rendered $done chapters in $([int]((Get-Date)-$started).TotalSeconds)s; latest $($job.id)" }
  if($Limit -gt 0 -and $done -ge $Limit) { break }
}
Write-Output "Finished $done recordings in $([int]((Get-Date)-$started).TotalSeconds)s."
