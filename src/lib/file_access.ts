
function downloadURL(data: string, fileName: string) {
  const a = document.createElement('a');
  a.href = data;
  a.download = fileName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function saveFile(data: Uint8Array, fileName: string, mimeType = "application/octet-stream") {
  const blob = new Blob([data], {
    type: mimeType
  });

  const url = window.URL.createObjectURL(blob);
  downloadURL(url, fileName);
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

export function readFile(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      resolve(new Uint8Array(reader.result as ArrayBuffer));
    });
    reader.addEventListener('error', () => {
      reject(reader.error);
    });
    reader.addEventListener('abort', () => {
      reject(new Error('load aborted'));
    });
    reader.readAsArrayBuffer(file);
  });
}

export async function readFileOrUrl(file: File | string): Promise<Uint8Array> {
  if (typeof file === 'string') {
    const response = await fetch(file);
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  } else {
    return readFile(file);
  }
}

export function parseRegionFileName(name: string): { x: number, z: number } {
  const match = name.match(/.*r\.(-?[0-9]+)\.(-?[0-9]+)\.mca$/);
  if (!match) {
    return { x: Infinity, z: Infinity };
  }
  return {
    x: parseInt(match[1]),
    z: parseInt(match[2])
  };
}

export function fileName(file: File | string) {
  if (typeof file === 'string') {
    return file.replace(/^.*\/([^/]+)$/, '$1');
  } else {
    return file.name;
  }
}

export function fileSize(file: File | string) {
  if (typeof file === 'string') {
    return NaN;
  } else {
    return file.size;
  }
}

export function sortFilesByDistance(fileList: Array<File | string>): Array<File | string> {
  fileList.sort((aFile, bFile) => {
    const a = parseRegionFileName(fileName(aFile));
    const b = parseRegionFileName(fileName(bFile));
    return (a.x * a.x + a.z * a.z) - (b.x * b.x + b.z * b.z);
  });

  return fileList;
}