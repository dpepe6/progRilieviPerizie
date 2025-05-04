import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { HttpClient, HttpHeaders, HttpClientModule } from '@angular/common/http';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { jwtDecode } from 'jwt-decode';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, HttpClientModule],
})
export class DashboardPage {
  descrizione: string = '';
  commentoFoto: string = '';
  fotoSelezionate: { base64?: string; url?: string; commento: string; idFoto: string;}[] = [];
  coordinate: { latitudine: number; longitudine: number } | null = null;
  dataOra: string = '';
  codiceOperatore: string = ''; 
  currentPassword: string = '';
  nuovaPassword: string = '';
  constructor(private http: HttpClient) {}
  async cambiaPassword(event: Event) {
    event.preventDefault();

    if (!this.nuovaPassword || this.nuovaPassword.length < 8) {
      alert('La nuova password deve contenere almeno 8 caratteri.');
      return;
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
      alert('Sessione scaduta. Effettua nuovamente il login.');
      return;
    }

    //const url = 'https://progrilieviperizie.onrender.com/api/cambia-password';
    const url = 'http://localhost:3000/api/cambia-password';
    const body = {
      currentPassword: this.currentPassword,
      nuovaPassword: this.nuovaPassword,
    };

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    try {
      const response: any = await this.http.post(url, body, { headers }).toPromise();
      alert(response.message || 'Password aggiornata con successo.');
      this.currentPassword = '';
      this.nuovaPassword = '';
    } catch (err: any) {
      console.error('Errore durante il cambio della password:', err);
      alert(err.error?.message || 'Errore durante il cambio della password. Riprova.');
    }
  }
  async scattaFoto() {
    try {
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl, 
        source: CameraSource.Camera,
        quality: 90,
      });

      if (!photo.dataUrl) {
        alert('Errore durante l\'acquisizione della foto.');
        return;
      }

      const file = this.dataUrlToFile(photo.dataUrl, 'photo.jpg');
      const url = await this.caricaSuCloudinary(file);

      this.fotoSelezionate.push({
        url, 
        commento: this.commentoFoto || 'Nessun commento',
        idFoto: `FOTO${this.fotoSelezionate.length + 1}`,
      });
    } catch (err) {
      console.error('Errore durante lo scatto della foto o fotocamera non disponibile:', err);
      alert('Fotocamera non disponibile. Usa il pulsante "Carica Foto" per selezionare un\'immagine dal tuo computer.');
    }
  }

  caricaFoto() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = async (event: any) => {
      const files = event.target.files;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (file.size > 5 * 1024 * 1024) {
          alert(`Il file "${file.name}" supera la dimensione massima di 5 MB.`);
          continue;
        }

        try {
          const url = await this.caricaSuCloudinary(file);
          this.fotoSelezionate.push({
            url, 
            commento: this.commentoFoto || 'Nessun commento',
            idFoto: `FOTO${this.fotoSelezionate.length + 1}`,
          });
        } catch (err) {
          console.error('Errore durante il caricamento su Cloudinary:', err);
          alert('Errore durante il caricamento dell\'immagine. Riprova.');
        }
      }
    };
    input.click();
  }
  async caricaSuCloudinary(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'mioPreset'); 

    const response = await fetch('https://api.cloudinary.com/v1_1/dmu6njtxz/image/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Errore durante il caricamento su Cloudinary');
    }

    const result = await response.json();
    return result.secure_url; 
  }

  dataUrlToFile(dataUrl: string, filename: string): File {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  }
  rimuoviFoto(index: number) {
    this.fotoSelezionate.splice(index, 1);
  }
  logout() {
    localStorage.removeItem('authToken'); 
    alert('Logout effettuato con successo.');
    window.location.href = '/login'; 
  }
  

  decodificaToken(): void {
    const token = localStorage.getItem('authToken');
    if (!token) {
      alert('Sessione scaduta. Effettua nuovamente il login.');
      return;
    }
  
    try {
      const decoded: any = jwtDecode(token);
      this.codiceOperatore = decoded._id; 
    } catch (err) {
      console.error('Errore durante la decodifica del token:', err);
      alert('Errore durante la decodifica del token. Effettua nuovamente il login.');
    }
  }

  async onSubmit(event: Event) {
    event.preventDefault();

    if (!this.descrizione || this.fotoSelezionate.length === 0) {
      alert('Inserisci una descrizione e almeno una foto.');
      return;
    }

    try {
      await this.ottieniCoordinate(); 
      this.dataOra = new Date().toISOString(); 
      this.decodificaToken();

      const token = localStorage.getItem('authToken');
      if (!token) {
        alert('Sessione scaduta. Effettua nuovamente il login.');
        return;
      }

      //const urlIdPerizia = 'https://progrilieviperizie.onrender.com/api/idPerizia';
      //const urlUploadPerizia = 'https://progrilieviperizie.onrender.com/api/upload-perizia';
      const urlIdPerizia = 'http://localhost:3000/api/idPerizia';
      const urlUploadPerizia = 'http://localhost:3000/api/upload-perizia';

      let body = {
        descrizione: this.descrizione,
        foto: this.fotoSelezionate,
        coordinate: this.coordinate || { lat: 0, lng: 0 }, 
        dataOra: this.dataOra || new Date().toISOString(),
        idUtente: this.codiceOperatore || 'Sconosciuto',
        codicePerizia: '',
      };

      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
      });

      console.log('Dati inviati al backend:', body);
      console.log('Header Authorization:', headers.get('Authorization'));

      this.http.get(urlIdPerizia).subscribe({
        next: (responseIdPerizia: any) => {

          body.codicePerizia = `PER${responseIdPerizia.length+1}`;

          // Invia i dati al backend
          this.http.post(urlUploadPerizia, body, { headers }).subscribe({
            next: (responseUploadPerizia: any) => {
              console.log('Perizia caricata con successo:', responseUploadPerizia);
              alert('Perizia caricata con successo!');
              this.descrizione = '';
              this.commentoFoto = '';
              this.fotoSelezionate = [];
            },
            error: (err:any) => {
              console.error('Errore durante il caricamento della perizia:', err);
              alert('Errore durante il caricamento della perizia. Riprova.');
            },
          });
        },
        error: (err:any) => {
          console.error('Errore durante il caricamento della perizia:', err);
          alert('Errore durante il caricamento della perizia. Riprova.');
        },
      });

      
    } catch (err) {
      console.error('Errore durante il recupero delle coordinate o l\'invio:', err);
      alert('Errore durante il recupero delle coordinate o l\'invio. Riprova.');
    }
  }
  async ottieniCoordinate() {
    try {
      const permission = await Geolocation.requestPermissions();
      if (permission.location !== 'granted') {
        alert('Permesso di geolocalizzazione negato.');
        return;
      }
  
      const position = await Geolocation.getCurrentPosition();
      this.coordinate = {
        latitudine: position.coords.latitude,
        longitudine: position.coords.longitude,
      };
    } catch (err) {
      console.error('Errore durante il recupero delle coordinate:', err);
      alert('Impossibile ottenere le coordinate GPS.');
    }
  }
}