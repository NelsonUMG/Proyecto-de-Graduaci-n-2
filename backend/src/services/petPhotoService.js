const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

const photoDirectory = path.resolve(__dirname, '../../uploads/pets');
const photoNamePattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

const imageType = (buffer) => {
  if (buffer.length >= 3 && buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) {
    return { extension: 'jpg', mime: 'image/jpeg' };
  }
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { extension: 'png', mime: 'image/png' };
  }
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return { extension: 'webp', mime: 'image/webp' };
  }
  return null;
};

const storedName = (url) => {
  const prefix = '/api/pet-photos/';
  if (!url?.startsWith(prefix)) return null;
  const name = url.slice(prefix.length);
  return photoNamePattern.test(name) ? name : null;
};

const filePath = (name) => photoNamePattern.test(name) ? path.join(photoDirectory, name) : null;

const save = async (buffer) => {
  const type = imageType(buffer);
  if (!type) return null;
  await fs.mkdir(photoDirectory, { recursive: true });
  const name = `${crypto.randomUUID()}.${type.extension}`;
  await fs.writeFile(filePath(name), buffer, { flag: 'wx' });
  return { name, url: `/api/pet-photos/${name}`, mime: type.mime };
};

const remove = async (name) => {
  const target = filePath(name);
  if (target) await fs.unlink(target).catch((error) => { if (error.code !== 'ENOENT') throw error; });
};

module.exports = { imageType, storedName, filePath, save, remove };
