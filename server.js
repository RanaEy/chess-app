const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // React uygulamanızın adresi
    methods: ["GET", "POST"]
  }
});

// Aktif odaları ve o odadaki oyuncuları takip etmek için basit bir hafıza
const odalar = {};

io.on('connection', (socket) => {
  console.log('Bir kullanıcı bağlandı:', socket.id);

  // Oyuncu bir odaya katılmak istediğinde
  socket.on('odayaKatil', (odaID) => {
    socket.join(odaID);
    
    if (!odalar[odaID]) {
      odalar[odaID] = [];
    }
    
    // Eğer odada zaten aynı kullanıcı yoksa listeye ekle
    if (!odalar[odaID].includes(socket.id)) {
      odalar[odaID].push(socket.id);
    }

    console.log(`${socket.id} kullanıcısı ${odaID} odasına girdi. Odadaki kişi sayısı: ${odalar[odaID].length}`);

    // Odadaki oyunculara rollerini atayalım (İlk giren beyaz, ikinci giren siyah)
    const rol = odalar[odaID][0] === socket.id ? 'beyaz' : 'siyah';
    socket.emit('rolAtamasi', rol);

    // Odada iki kişi olduysa oyunu başlatabiliriz
    if (odalar[odaID].length === 2) {
      io.to(odaID).emit('oyunBasladi', { mesaj: "Rakip bulundu, oyun başlıyor!" });
    }
  });

  // Bir oyuncu taş oynattığında hamleyi odadaki diğer oyuncuya ilet
  socket.on('hamleYap', ({ odaID, hamleVerisi }) => {
    // Hamleyi yapan hariç odadaki diğer herkese gönderir
    socket.to(odaID).emit('rakipHamleYapti', hamleVerisi);
  });

  // Kullanıcı bağlantıyı kestiğinde odadan temizle
  socket.on('disconnect', () => {
    console.log('Kullanıcı ayrıldı:', socket.id);
    for (const odaID in odalar) {
      odalar[odaID] = odalar[odaID].filter(id => id !== socket.id);
      if (odalar[odaID].length === 0) {
        delete odalar[odaID];
      } else {
        io.to(odaID).emit('rakipAyrildi', { mesaj: "Rakibiniz oyundan ayrıldı." });
      }
    }
  });
});

const PORT = 5001;
server.listen(PORT, () => {
  console.log(`Satranç Backend Sunucusu ${PORT} portunda tıkır tıkır çalışıyor... 🚀`);
});