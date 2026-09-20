import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = path.join(root, 'src/bootstrap/forms-bootstrap.css');
const dest = path.join(root, 'dist/bootstrap/forms-bootstrap.css');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(src, dest);
