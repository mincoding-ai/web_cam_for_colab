async function startWebcam(width, height) {
  const W = width;
  const H = height;

  const video = document.createElement('video');
  video.autoplay = true;

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const stream = await navigator.mediaDevices.getUserMedia({ video: { width: W, height: H } });
  video.srcObject = stream;
  await video.play();

  const comm = await google.colab.kernel.comms.open('webcam_comm', {});

  let running = true;

  (async () => {
    for await (const msg of comm.messages) {
      if (msg.data.type === 'stop') {
        running = false;
        stream.getTracks().forEach(t => t.stop());
      }
    }
  })();

  let latestBase64 = null;

  function captureLoop() {
    if (!running) return;
    ctx.drawImage(video, 0, 0, W, H);
    canvas.toBlob(blob => {
      const reader = new FileReader();
      reader.onloadend = () => {
        latestBase64 = reader.result.split(',')[1];
        requestAnimationFrame(captureLoop);
      };
      reader.readAsDataURL(blob);
    }, 'image/jpeg', 0.9);
  }

  async function sendLoop() {
    while (running) {
      if (latestBase64) {
        const b64 = latestBase64;
        latestBase64 = null;
        comm.send({ type: 'frame', image: b64 });
      }
      await new Promise(r => setTimeout(r, 30));
    }
  }

  captureLoop();
  sendLoop();
}
