import React, { useState, useEffect } from 'react';
import './App.css';
import { Tas, MoveRecord } from './types';
import { useWeb3 } from './context/Web3Context';
import { io } from 'socket.io-client';

// Bileşenler
import Board from './components/Board';
import CapturedZone from './components/CapturedZone';
import MoveList from './components/MoveList';
import { PromotionModal, GameOverModal } from './components/Modals';

// Resimler (Assets)
import kale_b from './assets/images/kale-b.png';
import at_b from './assets/images/at-b.png';
import fil_b from './assets/images/fil-b.png';
import vezir_b from './assets/images/vezir-b.png';
import sah_b from './assets/images/sah-b.png';
import piyon_b from './assets/images/piyon-b.png';
import kale_s from './assets/images/kale-s.png';
import at_s from './assets/images/at-s.png';
import fil_s from './assets/images/fil-s.png';
import vezir_s from './assets/images/vezir-s.png';
import sah_s from './assets/images/sah-s.png';
import piyon_s from './assets/images/piyon-s.png';


const boardToFen = (board: (Tas | null)[][], turn: string): string => {
  let fen = '';
  for (let r = 0; r < 8; r++) {
    let emptyCount = 0;
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece === null) {
        emptyCount++;
      } else {
        if (emptyCount > 0) {
          fen += emptyCount;
          emptyCount = 0;
        }
        let letter = '';
        switch (piece.id) {
          case 'piyon': letter = 'p'; break;
          case 'kale': letter = 'r'; break;
          case 'at': letter = 'n'; break;
          case 'fil': letter = 'b'; break;
          case 'vezir': letter = 'q'; break;
          case 'sah': letter = 'k'; break;
        }
        fen += piece.color === 'beyaz' ? letter.toUpperCase() : letter.toLowerCase();
      }
    }
    if (emptyCount > 0) fen += emptyCount;
    if (r < 7) fen += '/';
  }
  fen += turn === 'beyaz' ? ' w' : ' b';
  fen += ' KQkq - 0 1'; // Basitleştirilmiş rok/en passant hakları
  return fen;
};

// Yardımcı Fonksiyon: Taş Oluşturucu
const createPiece = (id: string, color: string, img: string): Tas => ({ id, color, img, hasMoved: false });

// Başlangıç Tahtası Dizilimi
const getInitialBoard = (): (Tas | null)[][] => [
  [
    createPiece('kale', 'siyah', kale_s), createPiece('at', 'siyah', at_s), createPiece('fil', 'siyah', fil_s), 
    createPiece('vezir', 'siyah', vezir_s), createPiece('sah', 'siyah', sah_s), createPiece('fil', 'siyah', fil_s), 
    createPiece('at', 'siyah', at_s), createPiece('kale', 'siyah', kale_s)
  ],
  Array(8).fill(null).map(() => createPiece('piyon', 'siyah', piyon_s)),
  Array(8).fill(null), Array(8).fill(null), Array(8).fill(null), Array(8).fill(null),
  Array(8).fill(null).map(() => createPiece('piyon', 'beyaz', piyon_b)),
  [
    createPiece('kale', 'beyaz', kale_b), createPiece('at', 'beyaz', at_b), createPiece('fil', 'beyaz', fil_b), 
    createPiece('vezir', 'beyaz', vezir_b), createPiece('sah', 'beyaz', sah_b), createPiece('fil', 'beyaz', fil_b), 
    createPiece('at', 'beyaz', at_b), createPiece('kale', 'beyaz', kale_b)
  ],
];

const cols = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const rows = ['8', '7', '6', '5', '4', '3', '2', '1'];

const socket = io('http://localhost:5001');

function App() {
  const { account, balance, connectWallet, disconnectWallet, getDailyPoints, harcaPuan, kazanPuan, loading } = useWeb3();

  // --- STATE YÖNETİMİ ---
  const [odaID, setOdaID] = useState<string>('');
  const [oyunModu, setOyunModu] = useState<'bot' | 'arkadas' | null>(null); // Mod seçimi için
  const [benimRengim, setBenimRengim] = useState<'beyaz' | 'siyah' | 'hepsi'>('hepsi');
  const [pieces, setPieces] = useState<(Tas | null)[][]>(getInitialBoard());
  const [sira, setSira] = useState<string>('beyaz'); 
  const [yenenBeyazlar, setYenenBeyazlar] = useState<Tas[]>([]); 
  const [yenenSiyahlar, setYenenSiyahlar] = useState<Tas[]>([]); 
  const [terfiBekleyenKare, setTerfiBekleyenKare] = useState<{r: number, c: number} | null>(null);
  const [olasiHamleler, setOlasiHamleler] = useState<{r: number, c: number}[]>([]);
  const [sahTehditte, setSahTehditte] = useState<boolean>(false);
  const [oyunDurumu, setOyunDurumu] = useState<string>('devam');
  const [sonHamle, setSonHamle] = useState<{ tas: Tas, eskiR: number, eskiC: number, yeniR: number, yeniC: number } | null>(null);

  useEffect(() => {
    // Sunucudan gelen rol atamasını dinle
    socket.on('rolAtamasi', (rol: 'beyaz' | 'siyah') => {
      setBenimRengim(rol);
      console.log("Bu oyundaki renginiz:", rol);
    });

    // Sunucudan gelen rakip hamlesini dinle
    socket.on('rakipHamleYapti', (hamleVerisi: any) => {
      // Rakibin gönderdiği yeni tahta matrisini doğrudan ekrana basıyoruz
      if (hamleVerisi.yeniTahta) setPieces(hamleVerisi.yeniTahta);
      if (hamleVerisi.yeniSira) setSira(hamleVerisi.yeniSira);
      if (hamleVerisi.yeniHistory) setHistory(hamleVerisi.yeniHistory);
      if (hamleVerisi.yeniViewIndex !== undefined) setViewIndex(hamleVerisi.yeniViewIndex);
    });

    socket.on('oyunBasladi', (data: any) => {
      alert(data.mesaj); // "Rakip bulundu, oyun başlıyor!" uyarısı
    });

    socket.on('rakipAyrildi', (data: any) => {
      alert(data.mesaj);
    });

    return () => {
      socket.off('rolAtamasi');
      socket.off('rakipHamleYapti');
      socket.off('oyunBasladi');
      socket.off('rakipAyrildi');
    };
  }, []);

  const executeMove = (eskiSatir: number, eskiSutun: number, yeniSatir: number, yeniSutun: number) => {
  const oynananTas = pieces[eskiSatir][eskiSutun];
  if (!oynananTas) return;

  const simuleTahta = pieces.map(row => [...row]);
  simuleTahta[yeniSatir][yeniSutun] = simuleTahta[eskiSatir][eskiSutun];
  simuleTahta[eskiSatir][eskiSutun] = null;

  if (sahTehditteMi(simuleTahta, sira)) return;

  const yeniTahta = pieces.map(row => [...row]);
  let tasYendiMi = false;
  let castleType: string | null = null;

  // En Passant Yeme İşlemi
  if (oynananTas.id === 'piyon' && Math.abs(yeniSutun - eskiSutun) === 1 && pieces[yeniSatir][yeniSutun] === null) {
    const yenenPiyonSatir = eskiSatir;
    const yenenPiyon = yeniTahta[yenenPiyonSatir][yeniSutun];
    if (yenenPiyon) {
      if (yenenPiyon.color === 'beyaz') setYenenBeyazlar(prev => [...prev, yenenPiyon]);
      else setYenenSiyahlar(prev => [...prev, yenenPiyon]);
      yeniTahta[yenenPiyonSatir][yeniSutun] = null;
      tasYendiMi = true;
    }
  }

  // Normal Yeme İşlemi
  const hedefKaredekiTas = pieces[yeniSatir][yeniSutun];
  if (hedefKaredekiTas && !tasYendiMi) {
    tasYendiMi = true;
    if (hedefKaredekiTas.color === 'beyaz') setYenenBeyazlar(prev => [...prev, hedefKaredekiTas]);
    else setYenenSiyahlar(prev => [...prev, hedefKaredekiTas]);
  }

  // Taşı Taşıma
  const guncelTas = { ...oynananTas, hasMoved: true };
  yeniTahta[yeniSatir][yeniSutun] = guncelTas;
  yeniTahta[eskiSatir][eskiSutun] = null;

  // Rok Kalesi Taşıma
  if (guncelTas.id === 'sah' && Math.abs(yeniSutun - eskiSutun) === 2) {
    if (yeniSutun > eskiSutun) {
      castleType = 'short';
      const kale = yeniTahta[eskiSatir][7];
      if (kale) yeniTahta[eskiSatir][5] = { ...kale, hasMoved: true };
      yeniTahta[eskiSatir][7] = null;
    } else {
      castleType = 'long';
      const kale = yeniTahta[eskiSatir][0];
      if (kale) yeniTahta[eskiSatir][3] = { ...kale, hasMoved: true };
      yeniTahta[eskiSatir][0] = null;
    }
  }

  // Notasyon ve Geçmiş
  let notation = getMoveNotation(oynananTas, eskiSutun, yeniSatir, yeniSutun, tasYendiMi, castleType);
  const sonrakiSira = sira === 'beyaz' ? 'siyah' : 'beyaz';
  if (sahTehditteMi(yeniTahta, sonrakiSira)) notation += "+";

  setPieces(yeniTahta);
  setSonHamle({ tas: guncelTas, eskiR: eskiSatir, eskiC: eskiSutun, yeniR: yeniSatir, yeniC: yeniSutun });

  const yeniHistory = [...history, { board: yeniTahta, notation: notation, turn: sonrakiSira }];
  setHistory(yeniHistory);
  setViewIndex(yeniHistory.length - 1);

  // Piyon Terfi Kontrolü
  if (guncelTas.id === 'piyon') {
    const sonSatir = guncelTas.color === 'beyaz' ? 0 : 7;
    if (yeniSatir === sonSatir) {
      setTerfiBekleyenKare({ r: yeniSatir, c: yeniSutun });
      return;
    }
  }

  setSira(sonrakiSira);
};

  // Hamle Geçmişi (Stack Yapısı)
  const [history, setHistory] = useState<MoveRecord[]>([
    { board: getInitialBoard(), notation: "Start", turn: 'beyaz' }
  ]);
  const [viewIndex, setViewIndex] = useState<number>(0);

  // Hamle Notasyonu Oluşturma (Örn: Axe4)
  const getMoveNotation = (tas: Tas, eskiC: number, yeniR: number, yeniC: number, capture: boolean, castle: string | null) => {
    if (castle === 'short') return "O-O";
    if (castle === 'long') return "O-O-O";
    const pieceNames: {[key: string]: string} = { 'kale': 'R', 'at': 'N', 'fil': 'B', 'vezir': 'Q', 'sah': 'K', 'piyon': '' };
    let note = pieceNames[tas.id];
    if (tas.id === 'piyon' && capture) note = cols[eskiC]; 
    if (capture) note += 'x';
    note += cols[yeniC] + rows[yeniR];
    return note;
  };

  // Yolun Boş Olup Olmadığını Kontrol Eden Algoritma
  const yolAcikMi = (eskiR: number, eskiC: number, yeniR: number, yeniC: number, tahta: (Tas | null)[][]) => {
    const satirFarki = yeniR - eskiR;
    const sutunFarki = yeniC - eskiC;
    const satirAdimi = satirFarki === 0 ? 0 : satirFarki / Math.abs(satirFarki);
    const sutunAdimi = sutunFarki === 0 ? 0 : sutunFarki / Math.abs(sutunFarki);
    let suAnkiR = eskiR + satirAdimi;
    let suAnkiC = eskiC + sutunAdimi;
    while (suAnkiR !== yeniR || suAnkiC !== yeniC) {
      if (tahta[suAnkiR][suAnkiC] !== null) return false; 
      suAnkiR += satirAdimi;
      suAnkiC += sutunAdimi;
    }
    return true;
  };

  // --- HAMLE DOĞRULAMA MOTORU ---
  const hareketGecerliMi = (tas: Tas, eskiR: number, eskiC: number, yeniR: number, yeniC: number, tahta: (Tas | null)[][]) => {
    const renk = tas.color;
    const satirFarki = Math.abs(yeniR - eskiR);
    const sutunFarki = Math.abs(yeniC - eskiC);
    const hedefTas = tahta[yeniR][yeniC];
    if (hedefTas && hedefTas.color === renk) return false; // Kendi taşını yiyemezsin

    // 1. Piyon Mantığı
    if (tas.id === 'piyon') {
      const yon = renk === 'beyaz' ? -1 : 1; 
      const baslangicSatiri = renk === 'beyaz' ? 6 : 1;
      const gercekSatirFarki = yeniR - eskiR;
      
      // Düz gitme
      if (sutunFarki === 0 && gercekSatirFarki === yon) return tahta[yeniR][yeniC] === null;
      // İki kare çıkış
      if (sutunFarki === 0 && gercekSatirFarki === (yon * 2) && eskiR === baslangicSatiri) {
         return tahta[yeniR][yeniC] === null && tahta[eskiR + yon][eskiC] === null;
      }
      // Çapraz yeme (Normal ve Geçerken Alma)
      if (sutunFarki === 1 && gercekSatirFarki === yon) {
         if (hedefTas !== null && hedefTas.color !== renk) return true;
         // En Passant (Geçerken Alma) Kontrolü
         if (hedefTas === null && sonHamle) {
             const { tas: sonTas, eskiR: sEskiR, yeniR: sYeniR, yeniC: sYeniC } = sonHamle;
             if (sonTas.id === 'piyon' && Math.abs(sYeniR - sEskiR) === 2 && sYeniC === yeniC && sYeniR === eskiR) return true;
         }
      }
      return false; 
    }
    // 2. Kale Mantığı
    if (tas.id === 'kale') {
      if (satirFarki === 0 || sutunFarki === 0) return yolAcikMi(eskiR, eskiC, yeniR, yeniC, tahta);
      return false;
    }
    // 3. Fil Mantığı
    if (tas.id === 'fil') {
      if (satirFarki === sutunFarki) return yolAcikMi(eskiR, eskiC, yeniR, yeniC, tahta);
      return false;
    }
    // 4. Vezir Mantığı
    if (tas.id === 'vezir') {
      if ((satirFarki === 0 || sutunFarki === 0) || (satirFarki === sutunFarki)) return yolAcikMi(eskiR, eskiC, yeniR, yeniC, tahta);
      return false;
    }
    // 5. At Mantığı
    if (tas.id === 'at') return (satirFarki === 2 && sutunFarki === 1) || (satirFarki === 1 && sutunFarki === 2);
    
    // 6. Şah ve ROK Mantığı (Güncellenmiş Kısım)
    if (tas.id === 'sah') {
      // Normal hareket
      if (satirFarki <= 1 && sutunFarki <= 1) return true;
      
      // Rok Kontrolleri
      if (!tas.hasMoved && satirFarki === 0 && sutunFarki === 2) {
        // Kural: Şah şu an tehdit altındaysa rok yapamaz
        if (sahTehditteMi(pieces, tas.color)) return false;

        if (yeniC > eskiC) { // Kısa Rok (Sağ)
            const sagKale = tahta[eskiR][7];
            if (sagKale && sagKale.id === 'kale' && !sagKale.hasMoved) {
                if (!yolAcikMi(eskiR, eskiC, eskiR, 7, tahta)) return false;
                // Şahın üzerinden geçtiği kare (f sütunu) güvenli mi?
                const araKareSimulasyon = tahta.map(r => [...r]);
                araKareSimulasyon[eskiR][eskiC + 1] = tas; 
                araKareSimulasyon[eskiR][eskiC] = null;
                if (sahTehditteMi(araKareSimulasyon, tas.color)) return false;
                return true;
            }
        } else { // Uzun Rok (Sol)
            const solKale = tahta[eskiR][0];
            if (solKale && solKale.id === 'kale' && !solKale.hasMoved) {
                if (!yolAcikMi(eskiR, eskiC, eskiR, 0, tahta)) return false;
                // Şahın üzerinden geçtiği kare (d sütunu) güvenli mi?
                const araKareSimulasyon = tahta.map(r => [...r]);
                araKareSimulasyon[eskiR][eskiC - 1] = tas;
                araKareSimulasyon[eskiR][eskiC] = null;
                if (sahTehditteMi(araKareSimulasyon, tas.color)) return false;
                return true;
            }
        }
      }
      return false;
    }
    return false; 
  };

  // --- ŞAH GÜVENLİĞİ SİMÜLASYONU ---
  const sahTehditteMi = (tahta: (Tas | null)[][], renk: string) => {
    let sahPos = { r: -1, c: -1 };
    // Şahı bul
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (tahta[r][c]?.id === 'sah' && tahta[r][c]?.color === renk) {
          sahPos = { r, c };
          break;
        }
      }
    }
    if (sahPos.r === -1) return false; // Şah yoksa (hata durumu)
    
    // Tüm düşman taşlarını kontrol et
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const tas = tahta[r][c];
        if (tas && tas.color !== renk) {
          if (hareketGecerliMi(tas, r, c, sahPos.r, sahPos.c, tahta)) return true;
        }
      }
    }
    return false;
  };

  // Oyun Durumu Kontrolü (Her hamleden sonra çalışır)
  useEffect(() => {
    const tehditVar = sahTehditteMi(pieces, sira);
    setSahTehditte(tehditVar);
    let hamleVar = false;
    // Oynayacak tarafın geçerli en az 1 hamlesi var mı?
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const tas = pieces[r][c];
            if (tas && tas.color === sira) {
                for (let tr = 0; tr < 8; tr++) {
                    for (let tc = 0; tc < 8; tc++) {
                        if (hareketGecerliMi(tas, r, c, tr, tc, pieces)) {
                            const kopyaTahta = pieces.map(row => [...row]);
                            kopyaTahta[tr][tc] = kopyaTahta[r][c];
                            kopyaTahta[r][c] = null;
                            if (!sahTehditteMi(kopyaTahta, sira)) {
                                hamleVar = true;
                                break; 
                            }
                        }
                    }
                    if (hamleVar) break;
                }
            }
            if (hamleVar) break;
        }
        if (hamleVar) break;
    }

  if (!hamleVar) {
      if (tehditVar) {
        setOyunDurumu('mat');
        
        // Eğer sıra siyaha geçmişse ve yapay zeka hamle bulamayıp mat olduysa: Beyaz kazandı!
        if (sira === 'siyah') {
          kazanPuan(20);
          alert("Tebrikler! Yapay zekayı mat ettiniz ve 20 Oyun Puanı kazandınız! 🏆");
        }
      } else {
        setOyunDurumu('pat');
      }
    }
  }, [sira, pieces]);

  // Geçmişe Gitme Fonksiyonu
  const jumpToMove = (index: number) => {
    setViewIndex(index);
    setPieces(history[index].board);
    setSira(history[index].turn);
  };
    
    // Geçmişi de bu tertemiz orijinal tahtayla sıfırlıyoruz
    const oyunuSifirla = () => {
    if (account) {
      const basariliMi = harcaPuan(10);
      if (!basariliMi) return;
    }

    // İlk açılıştaki çalışan tahtayı kopyalıyoruz
    const ilkTahta = history && history[0] ? history[0].board : null;

    if (ilkTahta) {
      const temizTahta = JSON.parse(JSON.stringify(ilkTahta));
      setPieces(temizTahta);
      setHistory(([{ board: temizTahta, notation: 'Başlangıç', turn: 'beyaz' }] as any) as any[]);
    }
    
    setSira('beyaz');
    setOlasiHamleler([]);
    setSahTehditte(false);
    setOyunDurumu('devam');
    setYenenSiyahlar([]);
    setYenenBeyazlar([]);
    setTerfiBekleyenKare(null);
    setViewIndex(0);
  };

  const odayaBaglan = (secilenOda: string) => {
    if (!secilenOda.trim()) return;
    setOdaID(secilenOda);
    setOyunModu('arkadas');
    socket.emit('odayaKatil', secilenOda);
  };

  // --- SUNUM İÇİN DEMO FONKSİYONU ---
  const senaryoPiyonTerfisi = () => {
    // 1. Boş bir tahta matrisi oluştur
    const yeniTahta: (any)[][] = Array(8).fill(null).map(() => Array(8).fill(null));

    // 2. Kralları Yerleştir (Hata almamak için şart)
    yeniTahta[0][4] = (window as any).createPiece ? (window as any).createPiece('sah', 'siyah', sah_s) : { tip: 'sah', renk: 'siyah', img: sah_s };
    yeniTahta[7][4] = (window as any).createPiece ? (window as any).createPiece('sah', 'beyaz', sah_b) : { tip: 'sah', renk: 'beyaz', img: sah_b };

    // 3. PİYONU YERLEŞTİR
    yeniTahta[1][0] = (window as any).createPiece ? (window as any).createPiece('piyon', 'beyaz', piyon_b) : { tip: 'piyon', renk: 'beyaz', img: piyon_b };

    // 4. State'leri Güncelle
    setPieces(yeniTahta);
    setSira('beyaz');
    setOyunDurumu('devam');
    setTerfiBekleyenKare(null);
    setYenenBeyazlar([]);
    setYenenSiyahlar([]);
    setHistory([{ board: yeniTahta, notation: "Demo: Terfi", turn: 'beyaz' } as any]);
    setViewIndex(0);
  
    
// Geçmişi sıfırla ki "Geri Al" yapınca oyun bozulmasın
setHistory([{ board: yeniTahta, notation: "Demo: Terfi", turn: 'beyaz' }]);
setViewIndex(0);
};

  // Sürükleme Başladığında (Olası hamleleri göster)
  const surukleBasla = (e: React.DragEvent, satir: number, sutun: number) => {
    if (oyunDurumu !== 'devam') return; 
    if (viewIndex !== history.length - 1) return; // Geçmişe bakarken oynatmaz

    e.dataTransfer.setData("text/plain", `${satir},${sutun}`);
    const tas = pieces[satir][sutun];
    if (tas && tas.color === sira) { 
        const hamleler: {r: number, c: number}[] = [];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (r === satir && c === sutun) continue;
                if (hareketGecerliMi(tas, satir, sutun, r, c, pieces)) {
                    // Sanal Simülasyon
                    const kopyaTahta = pieces.map(row => [...row]);
                    kopyaTahta[r][c] = kopyaTahta[satir][sutun];
                    kopyaTahta[satir][sutun] = null;
                    if (!sahTehditteMi(kopyaTahta, sira)) {
                        hamleler.push({ r, c });
                    }
                }
            }
        }
        setOlasiHamleler(hamleler); 
    }
  };

  // --- HAMLE İŞLEME (onDrop) ---
  const birak = (e: React.DragEvent, yeniSatir: number, yeniSutun: number) => {
  e.preventDefault();
  setOlasiHamleler([]);
  if (oyunDurumu !== 'devam') return;
  if (viewIndex !== history.length - 1) return;

  const eskiKoordinat = e.dataTransfer.getData("text/plain");
  if (!eskiKoordinat) return;

  const [eskiSatirStr, eskiSutunStr] = eskiKoordinat.split(',');
  const eskiSatir = parseInt(eskiSatirStr);
  const eskiSutun = parseInt(eskiSutunStr);

  if (isNaN(eskiSatir) || isNaN(eskiSutun)) return;
  if (eskiSatir === yeniSatir && eskiSutun === yeniSutun) return;

  const oynananTas = pieces[eskiSatir][eskiSutun];
  if (!oynananTas || oynananTas.color !== sira) return;
  if (!hareketGecerliMi(oynananTas, eskiSatir, eskiSutun, yeniSatir, yeniSutun, pieces)) return;

  // Tüm hamle yürütme, yeme ve şah kontrollerini bu merkezi motor hallediyor:
    executeMove(eskiSatir, eskiSutun, yeniSatir, yeniSutun);

    // --- ENTEGRASYON DÜZELTMESİ (As Any ile Sıfır Hata Garantili) ---
    if ((oyunModu as any) === 'arkadas') {
      const sonrakiSira = sira === 'beyaz' ? 'siyah' : 'beyaz';
      
      setTimeout(() => {
        socket.emit('hamleYap', {
          odaID: odaID,
          hamleVerisi: {
            yeniTahta: (window as any).board || null, // Eğer matris penceredeyse veya direkt state'ten okunacaksa
            yeniSira: sonrakiSira,
            yeniViewIndex: viewIndex + 1
          }
        } as any);
      }, 50);
    }
};

  // Terfi İşlemi
  const terfiSec = (yeniTip: string) => {
      if (!terfiBekleyenKare) return;
      const { r, c } = terfiBekleyenKare;
      const yeniTahta = pieces.map(row => [...row]);
      const tas = yeniTahta[r][c];
      if (tas) {
          tas.id = yeniTip; 
          // Resim güncelleme
          if (tas.color === 'beyaz') {
              if (yeniTip === 'vezir') tas.img = vezir_b;
              if (yeniTip === 'kale') tas.img = kale_b;
              if (yeniTip === 'fil') tas.img = fil_b;
              if (yeniTip === 'at') tas.img = at_b;
          } else {
              if (yeniTip === 'vezir') tas.img = vezir_s;
              if (yeniTip === 'kale') tas.img = kale_s;
              if (yeniTip === 'fil') tas.img = fil_s;
              if (yeniTip === 'at') tas.img = at_s;
          }
      }
      
      // Geçmişi güncelle (Notation değişir: e8=Q)
      const lastHistory = history[history.length - 1];
      const terfiNotation = lastHistory.notation.replace("+", "") + "=" + (yeniTip === 'at' ? 'N' : yeniTip[0].toUpperCase());
      const updatedHistory = [...history];
      updatedHistory[history.length - 1] = { ...lastHistory, board: yeniTahta, notation: terfiNotation };

      setPieces(yeniTahta);
      setHistory(updatedHistory);
      setTerfiBekleyenKare(null); 
      setSira(onceki => onceki === 'beyaz' ? 'siyah' : 'beyaz'); 
  };

  useEffect(() => {
  // Sadece oyun modu 'bot' ise yapay zekayı çalıştır, arkadaş modunda kilitle!
  if (oyunModu === 'bot' && sira === 'siyah') {
    // mevcut stockfish / bot kodların aynen içeride kalacak...
  }
}, [sira, oyunModu]); // Bağımlılık dizisine oyunModu'nu da ekledik
    
    // 1. Tahtanın anlık matris durumunu yapay zekanın anlayacağı FEN metnine çeviriyoruz
    const currentFen = boardToFen(pieces, 'siyah');

   useEffect(() => {
    // 1. KORUMA: Eğer sıra bendeyse bot hamle yapmasın, sadece sıra rakiptediyse (bottaysa) çalışsın
    if (sira === benimRengim) return;

    // Stockfish motorunu ayağa kaldırıyoruz
    const aiWorker = new Worker('/stockfish-18.js');

    aiWorker.onmessage = (event: MessageEvent) => {
      const line = event.data;
      if (line.startsWith('bestmove')) {
        const bestMove = line.split(' ')[1];
        if (bestMove && bestMove !== '(none)') {
          const eskiSutun = cols.indexOf(bestMove[0] as any);
          const eskiSatir = rows.indexOf(bestMove[1] as any);
          const yeniSutun = cols.indexOf(bestMove[2] as any);
          const yeniSatir = rows.indexOf(bestMove[3] as any);

          setTimeout(() => {
            executeMove(eskiSatir, eskiSutun, yeniSatir, yeniSutun);
            aiWorker.terminate();
          }, 600);
        }
      }
    };

    // FEN durumunu güvenli alıyoruz, yoksa boş string geçsin
    const fenToUse = typeof currentFen !== 'undefined' ? currentFen : '';

    aiWorker.postMessage('uci');
    aiWorker.postMessage('isready');
    aiWorker.postMessage(`position fen ${fenToUse}`);
    aiWorker.postMessage('go depth 10');

    return () => {
      aiWorker.terminate();
    };
  }, [sira, benimRengim, typeof currentFen !== 'undefined' ? currentFen : '']);
  
  return (
    <div id="app">
      <PromotionModal
        isOpen={!!terfiBekleyenKare}
        sira={sira}
        onSelect={terfiSec}
        images={{ vezir: sira === 'beyaz' ? vezir_b : vezir_s, kale: sira === 'beyaz' ? kale_b : kale_s, fil: sira === 'beyaz' ? fil_b : fil_s, at: sira === 'beyaz' ? at_b : at_s }}
      />
      
      <GameOverModal oyunDurumu={oyunDurumu} sira={sira} onRestart={oyunuSifirla} />

      <div style={{ textAlign: 'center', color: 'white', fontSize: '24px', marginBottom: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
          Sıra: <span style={{ fontWeight: 'bold', color: sira === 'beyaz' ? '#eeeeed' : '#769656' }}>{sira === 'beyaz' ? 'BEYAZ' : 'SİYAH'}</span>
          <button className="restart-btn restart-btn-small" onClick={oyunuSifirla}>Yeniden Başlat</button>
        </div>
      </div>

      {/* Web3 Cüzdan Buton Alanı */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', marginTop: '10px', marginBottom: '20px' }}>
     {account ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ color: '#2ecc71', fontWeight: 'bold', fontSize: '14px' }}>
              🟢 Bağlı: {account.substring(0, 6)}...{account.substring(account.length - 4)}
            </span>
            
            {/* Oyun İçi Puan Göstergesi */}
            <span style={{ color: '#f1c40f', fontWeight: 'bold', fontSize: '14px', backgroundColor: '#2c3e50', padding: '4px 10px', borderRadius: '4px' }}>
              🪙 Puan: {balance}
            </span>

            {/* Ücretsiz Günlük Puan Harçlığı */}
            <button 
              onClick={getDailyPoints}
              style={{ background: '#3498db', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
            >
              🎁 Günlük Harçlık (+20)
            </button>

            <button 
              onClick={disconnectWallet}
              style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
            >
              Bağlantıyı Kes
            </button>
          </div>
        ) : (
          <button 
            onClick={connectWallet} 
            disabled={loading}
            style={{
              backgroundColor: '#f39c12',
              color: 'white',
              padding: '8px 16px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            {loading ? "Bağlanıyor..." : "MetaMask Cüzdanını Bağla"}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', marginTop: '10px' }}>
        <button onClick={senaryoPiyonTerfisi} style={{ backgroundColor: '#9b59b6', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          🚀 Demo: Piyon Terfisi
        </button>
      </div>

      {sahTehditte && oyunDurumu === 'devam' && (
        <div style={{ color: 'red', fontSize: '24px', fontWeight: 'bold', marginTop: '5px', textAlign: 'center', animation: 'pulse 1s infinite' }}>
          ⚠️ ŞAH ÇEKİLDİ!
        </div>
      )}

      <div className="game-area">
        <CapturedZone title="Beyazın Kazandıkları" pieces={yenenSiyahlar} />
        
        {/* --- MULTIPLAYER ODA GİRİŞ PANELİ --- */}
<div style={{ margin: '20px 0', padding: '15px', background: '#2c2c2c', borderRadius: '8px', color: '#fff' }}>
  <h3>Oyun Modu Seçimi</h3>
  
  {!oyunModu ? (
    <div style={{ display: 'flex', gap: '10px' }}>
      <button 
        onClick={() => setOyunModu('bot')} 
        style={{ padding: '10px 20px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
      >
        🤖 Bot ile Oyna
      </button>
      
      <div style={{ display: 'flex', gap: '5px' }}>
        <input 
          type="text" 
          placeholder="Oda ID Girin (Örn: 123)" 
          id="odaInput"
          style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', color: '#000' }}
        />
        <button 
          onClick={() => {
            const el = document.getElementById('odaInput') as HTMLInputElement;
            if (el && el.value) odayaBaglan(el.value);
          }} 
          style={{ padding: '10px 20px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          ⚔️ Arkadaşınla Oyna
        </button>
      </div>
    </div>
  ) : (
    <div>
      <p style={{ fontWeight: 'bold' }}>
        Aktif Mod: {oyunModu === 'bot' ? '🤖 Yapay Zeka (Stockfish)' : `⚔️ Çoklu Oyuncu (Oda: ${odaID})`}
      </p>
      {oyunModu === 'arkadas' && (
        <p style={{ fontSize: '14px', color: benimRengim === 'beyaz' ? '#fff' : '#aaa' }}>
          Renginiz: <span style={{ textTransform: 'uppercase', color: '#ffeb3b' }}>{benimRengim}</span> 
          {benimRengim === 'siyah' && " (Beyazın hamle yapması bekleniyor)"}
        </p>
      )}
      <button 
        onClick={() => {
          setOyunModu(null);
          setOdaID('');
          setBenimRengim('hepsi');
        }}
        style={{ marginTop: '10px', padding: '5px 10px', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
      >
        Modu Değiştir / Odadan Çık
      </button>
    </div>
  )}
</div>

        <Board
          pieces={pieces}
          sira={sira}
          olasiHamleler={olasiHamleler}
          sahTehditte={sahTehditte}
          oyunDurumu={oyunDurumu}
          onDragStart={surukleBasla}
          onDragEnd={() => setOlasiHamleler([])}
          onDrop={birak}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <CapturedZone title="Siyahın Kazandıkları" pieces={yenenBeyazlar} />
          <MoveList history={history} currentIndex={viewIndex} onJump={jumpToMove} />
        </div>
      </div>
    </div>
  );
}

export default App;