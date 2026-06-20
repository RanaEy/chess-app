// Satranç taşı yapısı
export interface Tas {
  id: string;      // 'kale', 'at', 'fil', 'vezir', 'sah', 'piyon'
  color: string;   // 'beyaz' veya 'siyah'
  img: string;     // Resim yolu
  hasMoved: boolean; // Rok ve piyonun 2 kare çıkışı için kritik
}

// Hamle geçmişi kaydı (Zaman yolculuğu için)
export interface MoveRecord {
  board: (Tas | null)[][]; // Tahtanın o anki fotoğrafı
  notation: string;        // Hamle notasyonu (e4, Axe5)
  turn: string;            // Sıra kimdeydi
}