import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { HttpClient,HttpClientModule, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-cambia-password',
  templateUrl: './cambia-password.page.html',
  styleUrls: ['./cambia-password.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, HttpClientModule],
})
export class CambiaPasswordPage {
  nuovaPassword: string = '';
  confermaPassword: string = '';
  errorMessage: string = '';

  constructor(private http: HttpClient, private router: Router) {}

  onSubmit(event: Event) {
    event.preventDefault();

    if (this.nuovaPassword !== this.confermaPassword) {
      this.errorMessage = 'Le password non coincidono!';
      return;
    }

    const token = localStorage.getItem('authToken'); 
    if (!token) {
      alert('Sessione scaduta. Effettua nuovamente il login.');
      this.router.navigateByUrl('/login', { replaceUrl: true });
      return;
    }

    //const url = 'https://progrilieviperizie.onrender.com/api/cambia-password'; 
    const url = 'http://localhost:3000/api/cambia-password';
    const body = {
      nuovaPassword: this.nuovaPassword
    };

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`, 
    });

    this.http.post(url, body, { headers }).subscribe({
      next: (response: any) => {
        console.log('Password cambiata con successo:', response);
        alert(response.message || 'Password cambiata con successo! Ora puoi accedere.');
        localStorage.removeItem('authToken'); 
        this.router.navigateByUrl('/login', { replaceUrl: true }); 
      },
      error: (err) => {
        console.error('Errore durante il cambio password:', err);
        this.errorMessage = err.error?.message || 'Errore durante il cambio password. Riprova.';
      },
    });
  }
}