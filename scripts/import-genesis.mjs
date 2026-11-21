import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';

const source = 'https://ebible.org/engwebp/GEN01.htm';
const response = process.argv[2] ? null : await fetch(source);
if (response && !response.ok) throw new Error(`Source returned ${response.status}`);
const html = process.argv[2] ? await readFile(process.argv[2], 'utf8') : await response.text();
const decode = (text) =>
	text
		.replace(/&#(x[\da-f]+|\d+);/gi, (_, code) =>
			String.fromCodePoint(
				code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code)
			)
		)
		.replace(/&amp;/g, '&')
		.replace(/&quot;/g, '"')
		.replace(/&nbsp;/g, ' ');

const verses = [
	...html.matchAll(
		/<span class="verse" id="V(\d+)">\d+&#160;<\/span>([\s\S]*?)(?=<span class="verse"|<ul class='tnav'>)/g
	)
].map((match) => ({
	number: Number(match[1]),
	text: decode(
		match[2].replace(/<a\b[^>]*class="notemark"[^>]*>[\s\S]*?<\/a>/g, '').replace(/<[^>]*>/g, '')
	)
		.replace(/\s+/g, ' ')
		.trim()
}));
if (verses.length !== 31 || verses.some((verse, i) => verse.number !== i + 1 || !verse.text)) {
	throw new Error(
		'Genesis 1 must contain 31 consecutive, nonempty verses. Source markup may have changed.'
	);
}
const chapter = {
	id: 'GEN.1',
	book: 'Genesis',
	chapter: 1,
	translation: 'World English Bible',
	translationId: 'engwebp',
	edition: 'Updated, 66-book protocanon',
	source,
	license: 'Public domain',
	sourceSha256: createHash('sha256').update(html).digest('hex'),
	verses
};
await mkdir('src/lib/bible', { recursive: true });
await writeFile('src/lib/bible/genesis-1.json', JSON.stringify(chapter, null, '\t') + '\n');
console.log(`Imported ${verses.length} verses from ${source}`);
