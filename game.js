const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let stack = [];
let current;
let gameRunning = false;
let score = 0;
let highScore = localStorage.getItem('chimneyHighScore') || 0;
const pieceHeight = 60;
const maxSpeed = 10;
let speed = 4;
let direction = 1;
let particles = [];

function randomColor(){return '#c0c0c0';}

function startGame() {
  stack = [{x:canvas.width/2-150,y:canvas.height - pieceHeight,width:300,color:randomColor()}];
  score = 0;
  speed = 4;
  gameRunning = true;
  spawnPiece();
  animate();
}

function spawnPiece(){
  const w = stack[stack.length-1].width;
  current = {x:0,y:stack[stack.length-1].y - pieceHeight,width:w,color:randomColor()};
}

function placePiece(){
  const last = stack[stack.length-1];
  const overlap = last.width - Math.abs(current.x - last.x);
  if(overlap > 0){
    const newWidth = overlap;
    const offset = current.x - last.x;
    current.x = last.x + offset/2;
    current.width = newWidth;
    stack.push(current);
    score++;
    if(score>highScore){highScore=score;localStorage.setItem('chimneyHighScore',highScore);}
    speed = Math.min(maxSpeed,speed+0.25);
    spawnPiece();
    createParticles(current.x+current.width/2,current.y);
  } else {
    endGame();
  }
}

function createParticles(x,y){
  for(let i=0;i<20;i++){
    particles.push({x,y,alpha:1,size:Math.random()*5+2,vx:(Math.random()-0.5)*2,vy:-Math.random()*2});
  }
}

function drawParticles(){
  particles.forEach(p=>{
    ctx.fillStyle=`rgba(200,200,200,${p.alpha})`;
    ctx.beginPath();
    ctx.arc(p.x,p.y,p.size,0,Math.PI*2);
    ctx.fill();
    p.x+=p.vx;p.y+=p.vy;p.alpha-=0.02;
  });
  particles=particles.filter(p=>p.alpha>0);
}

function animate(){
  if(!gameRunning) return;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  current.x += speed*direction;
  if(current.x + current.width > canvas.width || current.x < 0) direction *= -1;
  [...stack, current].forEach(b=>{
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x,b.y,b.width,pieceHeight);
  });
  drawParticles();
  ctx.fillStyle='#fff';ctx.font='24px Arial';ctx.fillText(`Score: ${score}`,20,40);
  ctx.fillText(`Highscore: ${highScore}`,20,70);
  requestAnimationFrame(animate);
}

function endGame(){
  gameRunning=false;
  document.getElementById('game-over').style.display='flex';
  document.getElementById('final-score').textContent='Your Score: '+score;
  document.getElementById('high-score').textContent='Highscore: '+highScore;
}

document.getElementById('start-btn').addEventListener('click',()=>{
  document.getElementById('start-screen').style.display='none';
  startGame();
});

document.getElementById('restart-btn').addEventListener('click',()=>{
  document.getElementById('game-over').style.display='none';
  startGame();
});

window.addEventListener('click',()=>{
  if(gameRunning) placePiece();
});