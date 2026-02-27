let webcamRunning = false;
let webcamStream = null;
let webcamComm = null;

async function startWebcam(width, height) {
  if (webcamRunning) return;
  const W = width;
  const H = height;

  const style = document.createElement('style');
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600&display=swap');
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    .cam-btn {
      font-family: 'DM Mono', monospace;
      font-size: 10px; font-weight: 500; letter-spacing: 0.08em;
      padding: 7px 16px; border-radius: 6px; border: none;
      cursor: pointer; transition: all 0.15s ease;
    }
    .cam-btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.08); }
    .cam-btn:active:not(:disabled) { transform: translateY(0); filter: brightness(0.95); }
    .cam-btn:disabled { opacity: 0.25; cursor: not-allowed; }
  `;
  document.head.appendChild(style);
  document.body.style.background = 'transparent';

  const root = document.createElement('div');
  root.style.cssText = `
    font-family: 'DM Sans', sans-serif;
    display: inline-flex;
    flex-direction: column;
    background: #fafbfc;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04);
  `;
  document.body.appendChild(root);

  // 헤더 - 3열 레이아웃 (버튼 | 제목 | 빈공간)
  const header = document.createElement('div');
  header.style.cssText = `
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    padding: 12px 16px;
    background: #ffffff;
    border-bottom: 1px solid #e2e8f0;
  `;

  // ★ 왼쪽 - 버튼
  const btnWrap = document.createElement('div');
  btnWrap.style.cssText = 'display:flex; gap:6px; align-items:center; justify-content:flex-start;';

  const startBtn = document.createElement('button');
  startBtn.className = 'cam-btn';
  startBtn.innerText = '▶ START';
  startBtn.style.cssText += `
    background: linear-gradient(135deg, #38bdf8, #2dd4bf);
    color: white;
    box-shadow: 0 2px 8px rgba(56,189,248,0.25);
  `;
  startBtn.disabled = true;

  const stopBtn = document.createElement('button');
  stopBtn.className = 'cam-btn';
  stopBtn.innerText = '■ STOP';
  stopBtn.style.cssText += `
    background: #fff; color: #64748b;
    border: 1px solid #e2e8f0 !important;
  `;

  btnWrap.appendChild(startBtn);
  btnWrap.appendChild(stopBtn);

  // ★ 가운데 - 제목
  const titleWrap = document.createElement('div');
  titleWrap.style.cssText = 'display:flex; align-items:center; gap:8px; justify-content:center;';

  const dot = document.createElement('div');
  dot.style.cssText = `
    width: 7px; height: 7px; border-radius: 50%;
    background: linear-gradient(135deg, #38bdf8, #2dd4bf);
    animation: pulse 2s infinite;
  `;

  const title = document.createElement('span');
  title.innerText = 'LIVE CAM';
  title.style.cssText = `
    font-family: 'DM Mono', monospace;
    font-size: 11px; font-weight: 500; letter-spacing: 0.12em;
    background: linear-gradient(90deg, #0ea5e9, #14b8a6);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  `;

  titleWrap.appendChild(dot);
  titleWrap.appendChild(title);

  // ★ 오른쪽 - 빈 공간 (균형용)
  const rightSpace = document.createElement('div');

  header.appendChild(btnWrap);
  header.appendChild(titleWrap);
  header.appendChild(rightSpace);
  root.appendChild(header);

  // 영상 패널
  const videoWrap = document.createElement('div');
  videoWrap.style.cssText = 'display:flex; gap:1px; background:#e2e8f0;';

  const makePanel = (label) => {
    const panel = document.createElement('div');
    panel.style.cssText = 'display:flex; flex-direction:column; background:#fff; position:relative;';

    const lbl = document.createElement('div');
    lbl.innerText = label;
    lbl.style.cssText = `
      padding: 5px 12px;
      font-family: 'DM Mono', monospace;
      font-size: 9px; font-weight: 500; letter-spacing: 0.1em;
      color: #94a3b8;
      background: #fafbfc;
      border-bottom: 1px solid #e2e8f0;
    `;
    panel.appendChild(lbl);
    return panel;
  };

  const makeWatermark = () => {
    const wm = document.createElement('div');
    wm.style.cssText = `
      position: absolute; bottom: 8px; right: 8px;
      display: flex; align-items: center; gap: 4px;
      opacity: 0.07; pointer-events: none;
    `;
    wm.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 40 40" fill="none">
        <defs>
          <linearGradient id="wg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#38bdf8"/>
            <stop offset="100%" stop-color="#2dd4bf"/>
          </linearGradient>
        </defs>
        <circle cx="20" cy="20" r="18" stroke="url(#wg)" stroke-width="3"/>
        <path d="M13 20 C13 14 27 14 27 20 C27 26 13 26 13 20Z" fill="url(#wg)"/>
        <circle cx="20" cy="20" r="4" fill="white"/>
      </svg>
      <span style="font-family:'DM Sans',sans-serif; font-size:11px; font-weight:700; color:#0ea5e9; letter-spacing:0.04em;">민코딩</span>
    `;
    return wm;
  };

  const panel1 = makePanel('INPUT');
  const video = document.createElement('video');
  video.width = W; video.height = H; video.autoplay = true;
  video.style.display = 'block';
  panel1.appendChild(video);
  panel1.appendChild(makeWatermark());

  const panel2 = makePanel('OUTPUT');
  const outputImg = document.createElement('img');
  outputImg.width = W; outputImg.height = H;
  outputImg.style.display = 'block';
  panel2.appendChild(outputImg);
  panel2.appendChild(makeWatermark());

  videoWrap.appendChild(panel1);
  videoWrap.appendChild(panel2);
  root.appendChild(videoWrap);

  // 상태바
  const statusBar = document.createElement('div');
  statusBar.style.cssText = `
    padding: 8px 16px;
    background: #ffffff;
    border-top: 1px solid #e2e8f0;
    display: flex; align-items: center; justify-content: space-between;
  `;

  const statusLeft = document.createElement('div');
  statusLeft.style.cssText = 'display:flex; align-items:center; gap:6px;';

  const statusDot = document.createElement('div');
  statusDot.style.cssText = 'width:5px; height:5px; border-radius:50%; background:#38bdf8;';

  const statusText = document.createElement('span');
  statusText.style.cssText = `
    font-family: 'DM Mono', monospace;
    font-size: 9px; letter-spacing: 0.08em; color: #94a3b8;
  `;
  statusText.innerText = 'CONNECTING...';

  statusLeft.appendChild(statusDot);
  statusLeft.appendChild(statusText);

  const wmBar = document.createElement('div');
  wmBar.style.cssText = 'display:flex; align-items:center; gap:3px; opacity:0.12;';
  wmBar.innerHTML = `
    <svg width="10" height="10" viewBox="0 0 40 40" fill="none">
      <defs>
        <linearGradient id="wg2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#38bdf8"/>
          <stop offset="100%" stop-color="#2dd4bf"/>
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="18" stroke="url(#wg2)" stroke-width="3"/>
      <path d="M13 20 C13 14 27 14 27 20 C27 26 13 26 13 20Z" fill="url(#wg2)"/>
      <circle cx="20" cy="20" r="4" fill="white"/>
    </svg>
    <span style="font-family:'DM Sans',sans-serif; font-size:9px; font-weight:600; color:#64748b; letter-spacing:0.05em;">민코딩</span>
  `;

  statusBar.appendChild(statusLeft);
  statusBar.appendChild(wmBar);
  root.appendChild(statusBar);

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  async function startStream() {
    webcamRunning = true;
    startBtn.disabled = true;
    stopBtn.disabled = false;
    statusDot.style.background = '#38bdf8';
    statusText.innerText = 'STREAMING · ACTIVE';

    webcamStream = await navigator.mediaDevices.getUserMedia({ video: { width: W, height: H } });
    video.srcObject = webcamStream;
    webcamComm = await google.colab.kernel.comms.open('webcam_comm', {});

    let frameCount = 0;
    (async () => {
      for await (const msg of webcamComm.messages) {
        if (msg.data.type === 'result') {
          outputImg.src = msg.data.image;
          frameCount++;
          statusText.innerText = `STREAMING · ${frameCount} FRAMES`;
        }
      }
    })();

    let latestBase64 = null;
    let isProcessing = false;

    function captureLoop() {
      if (!webcamRunning) return;
      ctx.drawImage(video, 0, 0, W, H);
      canvas.toBlob(async blob => {
        const buf = await blob.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
        latestBase64 = btoa(binary);
      }, 'image/jpeg', 0.4);
      requestAnimationFrame(captureLoop);
    }

    async function sendLoop() {
      while (webcamRunning) {
        if (latestBase64 && !isProcessing) {
          isProcessing = true;
          const b64 = latestBase64;
          latestBase64 = null;
          webcamComm.send({ type: 'frame', image: b64 });
          isProcessing = false;
        }
        await new Promise(r => setTimeout(r, 0));
      }
    }

    captureLoop();
    sendLoop();
  }

  function stopStream() {
    webcamRunning = false;
    if (webcamStream) { webcamStream.getTracks().forEach(t => t.stop()); webcamStream = null; }
    video.srcObject = null;
    outputImg.src = '';
    if (webcamComm) { webcamComm.send({ type: 'stop' }); webcamComm = null; }
    statusDot.style.background = '#e2e8f0';
    statusText.innerText = 'STOPPED';
    startBtn.disabled = false;
    stopBtn.disabled = true;
  }

  startBtn.onclick = () => startStream();
  stopBtn.onclick = () => stopStream();
  await startStream();
}
