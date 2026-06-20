import React from 'react';
import { Tas } from '../types';

interface BoardProps {
  pieces: (Tas | null)[][];
  sira: string;
  olasiHamleler: { r: number, c: number }[];
  sahTehditte: boolean;
  oyunDurumu: string;
  onDragStart: (e: React.DragEvent, r: number, c: number) => void;
  onDragEnd: () => void;
  onDrop: (e: React.DragEvent, r: number, c: number) => void;
}

const Board: React.FC<BoardProps> = ({ pieces, sira, olasiHamleler, sahTehditte, onDragStart, onDragEnd, onDrop }) => {
  
  const isPossibleMove = (r: number, c: number) => {
    return olasiHamleler.some(h => h.r === r && h.c === c);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Drop işlemine izin vermek için şart
  };

  return (
    <div className="board">
      {pieces.map((row, rIndex) => (
        <div key={rIndex} className="board-row">
          {row.map((piece, cIndex) => {
            const isBlackSquare = (rIndex + cIndex) % 2 === 1;
            const isPossible = isPossibleMove(rIndex, cIndex);
            
            // Şah tehdit altındaysa kırmızı yap
            let specialClass = '';
            if (piece?.id === 'sah' && piece.color === sira && sahTehditte) {
                specialClass = 'check-danger';
            }

            return (
              <div 
                key={cIndex}
                className={`square ${isBlackSquare ? 'black-square' : 'white-square'} ${isPossible ? 'possible-move' : ''} ${specialClass}`}
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, rIndex, cIndex)}
              >
                {piece && (
                  <img
                    src={piece.img}
                    alt={piece.id}
                    className="chess-piece"
                    draggable={true}
                    onDragStart={(e) => onDragStart(e, rIndex, cIndex)}
                    onDragEnd={onDragEnd}
                  />
                )}
                {isPossible && !piece && <div className="possible-dot"></div>}
                {isPossible && piece && <div className="possible-ring"></div>}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default Board;