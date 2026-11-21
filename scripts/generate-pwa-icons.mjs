// Render the project's gold book mark without a native graphics dependency.
import { mkdir, writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';

const bookPath =
	'M16 9C13 7 10 7 6 8V24C10 23 13 23 16 25C19 23 22 23 26 24V8C22 7 19 7 16 9M16 9V25';
const segments = [];
function line(a, b) {
	segments.push([a, b]);
}
function curve(a, b, c, d) {
	let previous = a;
	for (let i = 1; i <= 16; i++) {
		const t = i / 16,
			u = 1 - t;
		const next = [0, 1].map(
			(axis) =>
				u ** 3 * a[axis] + 3 * u ** 2 * t * b[axis] + 3 * u * t ** 2 * c[axis] + t ** 3 * d[axis]
		);
		line(previous, next);
		previous = next;
	}
}
curve([16, 9], [13, 7], [10, 7], [6, 8]);
line([6, 8], [6, 24]);
curve([6, 24], [10, 23], [13, 23], [16, 25]);
curve([16, 25], [19, 23], [22, 23], [26, 24]);
line([26, 24], [26, 8]);
curve([26, 8], [22, 7], [19, 7], [16, 9]);
line([16, 9], [16, 25]);

function distance(x, y, [a, b]) {
	const dx = b[0] - a[0],
		dy = b[1] - a[1];
	const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy)));
	return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy);
}

function crc32(bytes) {
	let crc = 0xffffffff;
	for (const byte of bytes) {
		crc ^= byte;
		for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
	}
	return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, bytes) {
	const name = Buffer.from(type),
		length = Buffer.alloc(4),
		crc = Buffer.alloc(4);
	length.writeUInt32BE(bytes.length);
	crc.writeUInt32BE(crc32(Buffer.concat([name, bytes])));
	return Buffer.concat([length, name, bytes, crc]);
}

function render(size, scale) {
	const rows = Buffer.alloc((size * 3 + 1) * size);
	for (let y = 0; y < size; y++)
		for (let x = 0; x < size; x++) {
			let coverage = 0;
			for (let sy = 0; sy < 3; sy++)
				for (let sx = 0; sx < 3; sx++) {
					const px = (((x + (sx + 0.5) / 3) / size) * 32 - 16) / scale + 16;
					const py = (((y + (sy + 0.5) / 3) / size) * 32 - 16) / scale + 16;
					if (segments.some((segment) => distance(px, py, segment) <= 0.7)) coverage++;
				}
			const offset = y * (size * 3 + 1) + 1 + x * 3;
			[201, 162, 39].forEach(
				(channel, i) => (rows[offset + i] = Math.round(10 + ((channel - 10) * coverage) / 9))
			);
		}
	const header = Buffer.alloc(13);
	header.writeUInt32BE(size, 0);
	header.writeUInt32BE(size, 4);
	header[8] = 8;
	header[9] = 2;
	return Buffer.concat([
		Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
		chunk('IHDR', header),
		chunk('IDAT', deflateSync(rows)),
		chunk('IEND', Buffer.alloc(0))
	]);
}

await mkdir('static/icons', { recursive: true });
await writeFile(
	'static/icons/app-icon.svg',
	`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><title>Help with the Bible</title><path fill="#0a0a0a" d="M0 0H32V32H0Z"/><path d="${bookPath}" fill="none" stroke="#c9a227" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>\n`
);
for (const [name, size, scale] of [
	['icon-192.png', 192, 1],
	['icon-512.png', 512, 1],
	['maskable-512.png', 512, 0.82],
	['apple-touch-icon.png', 180, 1]
]) {
	await writeFile(`static/icons/${name}`, render(size, scale));
}
console.log('Generated desktop, Android maskable, and Apple touch icons.');
