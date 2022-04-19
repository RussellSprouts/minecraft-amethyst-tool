
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
