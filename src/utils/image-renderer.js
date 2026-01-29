import { exec } from 'child_process';

function _execPromise(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        return reject(new Error(`Error rendering image: ${stderr}`));
      }
      return resolve(stdout);
    });
  });
}

async function renderImage(diagramFilepath, imgName, outputFolderFilepath) {
  const svgPath = `${imgName}.svg`;
  const pngPath = `${imgName}.png`;

  console.log('Generating SVG to detect diagram dimensions...');
  await _execPromise(`mmdc -i ${diagramFilepath} -o ${svgPath}`);

  const svgContent = await _execPromise(`grep -o 'viewBox="[^"]*"' ${svgPath} | head -1`);
  const match = svgContent.match(/viewBox="[\d.-]+\s+[\d.-]+\s+([\d.]+)\s+([\d.]+)"/);

  let width = 800;
  let height = 600;
  if (match) {
    width = Math.ceil(parseFloat(match[1]));
    height = Math.ceil(parseFloat(match[2]));
    console.log(`Detected diagram dimensions: ${width}x${height}`);
  } else {
    console.log('Could not parse viewBox, using default 800x600');
  }

  const commandToExec = `mmdc -i ${diagramFilepath} -o ${pngPath} --width ${width} --height ${height} && mv ${pngPath} ${outputFolderFilepath}`;
  console.log('Executing:', commandToExec, '...');
  await _execPromise(commandToExec);

  await _execPromise(`rm -f ${svgPath}`).catch(() => {});
}

export default renderImage;
