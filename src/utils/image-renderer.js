export function renderImage(mermaidCode, outputImgFilepath) {
  const tmpFile = 'temp.mmd';
  require('fs').writeFileSync(tmpFile, mermaidCode);

  exec(`npx mermaid-cli -i ${tmpFile} -o ${outputFilePath}`, (error, stdout, stderr) => {
    if (error) {
      console.error('Error rendering image:', stderr);
      throw error;
    }

    console.log('Image rendered successfully:', stdout);
  });
}
