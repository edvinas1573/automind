import React, { useEffect, useRef, useState } from 'react';

export function CarGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<'playing' | 'gameover'>('playing');
  
  // Game constants
  const carWidth = 60;
  const carHeight = 30;
  const obstacleWidth = 30;
  const obstacleHeight = 30;
  const gravity = 0.6;
  const jumpStrength = -10;
  const groundY = 150;

  // Game variables (refs to avoid re-renders)
  const carPos = useRef({ x: 50, y: groundY - carHeight, vy: 0, isJumping: false });
  const obstacles = useRef<{ x: number, type: 'cone' | 'pothole' }[]>([]);
  const frameCount = useRef(0);
  const speed = useRef(7);

  const resetGame = () => {
    carPos.current = { x: 50, y: groundY - carHeight, vy: 0, isJumping: false };
    obstacles.current = [];
    frameCount.current = 0;
    speed.current = 7;
    setScore(0);
    setGameState('playing');
  };

  const handleAction = () => {
    if (gameState === 'gameover') {
      resetGame();
      return;
    }
    if (!carPos.current.isJumping) {
      carPos.current.vy = jumpStrength;
      carPos.current.isJumping = true;
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const update = () => {
      if (gameState === 'gameover') return;

      frameCount.current++;
      
      // Update car
      carPos.current.vy += gravity;
      carPos.current.y += carPos.current.vy;

      if (carPos.current.y > groundY - carHeight) {
        carPos.current.y = groundY - carHeight;
        carPos.current.vy = 0;
        carPos.current.isJumping = false;
      }

      // Spawn obstacles
      if (frameCount.current % 80 === 0) {
        obstacles.current.push({ x: canvas.width, type: Math.random() > 0.5 ? 'cone' : 'pothole' });
        speed.current += 0.2; // Gradually increase speed
      }

      // Update obstacles
      obstacles.current.forEach(obs => {
        obs.x -= speed.current;
      });

      // Remove off-screen obstacles
      if (obstacles.current.length > 0 && obstacles.current[0].x < -obstacleWidth) {
        obstacles.current.shift();
        setScore(s => s + 1);
      }

      // Collision detection
      const car = carPos.current;
      for (const obs of obstacles.current) {
        if (
          car.x < obs.x + obstacleWidth - 5 &&
          car.x + carWidth - 5 > obs.x &&
          car.y < groundY &&
          car.y + carHeight > groundY - obstacleHeight
        ) {
          setGameState('gameover');
        }
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw road
      ctx.strokeStyle = '#e4e4e7';
      ctx.setLineDash([20, 20]);
      ctx.beginPath();
      ctx.moveTo(0, groundY + 5);
      ctx.lineTo(canvas.width, groundY + 5);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw car (simplified)
      const car = carPos.current;
      ctx.fillStyle = '#000';
      // Body
      ctx.fillRect(car.x, car.y, carWidth, carHeight);
      // Wheels
      ctx.beginPath();
      ctx.arc(car.x + 15, car.y + carHeight, 6, 0, Math.PI * 2);
      ctx.arc(car.x + carWidth - 15, car.y + carHeight, 6, 0, Math.PI * 2);
      ctx.fill();
      // Window
      ctx.fillStyle = '#fff';
      ctx.fillRect(car.x + 35, car.y + 5, 20, 10);

      // Draw obstacles
      obstacles.current.forEach(obs => {
        if (obs.type === 'cone') {
          ctx.fillStyle = '#f97316'; // Orange
          ctx.beginPath();
          ctx.moveTo(obs.x, groundY);
          ctx.lineTo(obs.x + obstacleWidth / 2, groundY - obstacleHeight);
          ctx.lineTo(obs.x + obstacleWidth, groundY);
          ctx.fill();
        } else {
          ctx.fillStyle = '#71717a'; // Gray pothole
          ctx.beginPath();
          ctx.ellipse(obs.x + obstacleWidth / 2, groundY, obstacleWidth / 2, 5, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      if (gameState === 'gameover') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#000';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('UPS! ATSITRENKĖTE', canvas.width / 2, canvas.height / 2 - 10);
        ctx.font = '14px sans-serif';
        ctx.fillText('Spauskite, kad bandytumėte dar kartą', canvas.width / 2, canvas.height / 2 + 20);
      }

      animationFrameId = requestAnimationFrame(() => {
        update();
        draw();
      });
    };

    draw();

    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState]);

  return (
    <div 
      className="relative flex flex-col items-center cursor-pointer select-none"
      onClick={handleAction}
      onTouchStart={(e) => {
        e.preventDefault();
        handleAction();
      }}
    >
      <div className="absolute top-4 right-4 text-xs font-bold uppercase tracking-widest text-zinc-400">
        Taškai: {score}
      </div>
      <canvas 
        ref={canvasRef} 
        width={400} 
        height={200} 
        className="max-w-full"
      />
      <div className="mt-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 animate-pulse">
        {gameState === 'playing' ? 'Spauskite, kad peršoktumėte kliūtį' : 'Bandykite dar kartą'}
      </div>
    </div>
  );
}
