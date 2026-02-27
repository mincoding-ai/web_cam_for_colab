async function startWebcam(width, height, pythonFunctionName){
  const W = width;
  const H = height;

  const container = document.createElement('div');
  container.style.display = "flex";
  container.style.gap = "10px";
  document.body.appendChild(container);

  const video = document.createElement('video');
  video.width = W; video.height = H; video.autoplay = true;
  container.appendChild(video);

  const outputImg = document.createElement('img');
  outputImg.width = W; outputImg.height = H;
  container.appendChild(outputImg);

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const stream = await navigator.mediaDevices.getUserMedia({ video: { width: W, height: H } });
  video.srcObject = stream;

  async function blobToBase64(blob){
    const buf = await blob.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = '';
    for(let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  let latestBase64 = null;
  let frameCount = 0;

  function captureLoop(){
    ctx.drawImage(video, 0, 0, W, H);
    canvas.toBlob(async blob => {
      const t0 = performance.now();
      latestBase64 = await blobToBase64(blob);
      const encodeTime = performance.now() - t0;
      if(frameCount % 30 === 0) console.log(`[인코딩] ${encodeTime.toFixed(1)}ms | 크기: ${(blob.size/1024).toFixed(1)}KB`);
    }, 'image/jpeg', 0.4);
    requestAnimationFrame(captureLoop);
  }

  async function sendLoop(){
    while(true){
      if(latestBase64){
        const base64data = latestBase64;
        latestBase64 = null;
        frameCount++;

        try {
          const t1 = performance.now();
          const result = await google.colab.kernel.invokeFunction(
            pythonFunctionName, [base64data], {}
          );
          const invokeTime = performance.now() - t1;

          const t2 = performance.now();
          let imgData = result?.data?.["text/plain"] || result?.data || "";
          imgData = imgData.replace(/^'|'$/g, "");
          if(imgData.startsWith("data:image")) outputImg.src = imgData;
          const renderTime = performance.now() - t2;

          if(frameCount % 30 === 0){
            console.log(`[invokeFunction] ${invokeTime.toFixed(1)}ms`);
            console.log(`[렌더링] ${renderTime.toFixed(1)}ms`);
            console.log(`[총합] ${(invokeTime + renderTime).toFixed(1)}ms`);
            console.log('---');
          }
        } catch(e) {
          console.error(e);
        }
      }
      await new Promise(r => setTimeout(r, 0));
    }
  }

  captureLoop();
  sendLoop();
}
