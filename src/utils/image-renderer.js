import { exec } from 'child_process';

async function renderImage(diagramFilepath, imgName, outputFolderFilepath) {
  const promise = new Promise((resolve, reject) => {
    const commandToExec = `mmdc -i ${diagramFilepath} -o ${imgName}.png --scale 4 && mv ${imgName}.png ${outputFolderFilepath}`;

    console.log('Executing:', commandToExec, '...')

    exec(commandToExec, (error, _stdout, stderr) => {
      if (error) {
        const err = new Error(`Error rendering image: ${stderr}`);
        return reject(error);
      }

      return resolve();
    });

  });

  return promise;
}

export default renderImage;
