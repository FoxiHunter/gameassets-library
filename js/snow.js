const canvas = document.getElementById("snowCanvas");
const ctx = canvas.getContext("2d");
let width, height;

function resize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

const snowConfig = {
  count: 150,
  generate: () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    r: Math.random() * 2 + 1,
    d: Math.random() * 2 + 1
  }),
  draw: f => {
    ctx.fillStyle = "rgba(200, 200, 255, 0.8)";
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
    ctx.fill();
  },
  move: f => f.y += f.d * 1.3,
  reset: f => {
    f.y = 0;
    f.x = Math.random() * width;
  }
};

let flakes = Array.from({ length: snowConfig.count }, () => snowConfig.generate());

function draw() {
  ctx.clearRect(0, 0, width, height);
  flakes.forEach(f => snowConfig.draw(f));
  move();
}

function move() {
  flakes.forEach(f => {
    snowConfig.move(f);
    if (f.y > height) snowConfig.reset(f);
  });
}

setInterval(draw, 30);
