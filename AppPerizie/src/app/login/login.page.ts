import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonCard, IonCardTitle, IonLabel, IonItem, IonCardHeader, IonCardContent, IonButton } from '@ionic/angular/standalone';
import { HttpClientModule } from '@angular/common/http';
import { HttpClient } from '@angular/common/http'; 
import { Observable } from 'rxjs';
import {IonicModule} from '@ionic/angular';
import { Router } from '@angular/router';
@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
imports: [
  CommonModule,
  FormsModule,
  HttpClientModule,
  IonicModule,
],
})
export class LoginPage implements OnInit {
  username: string = '';
  password: string = '';
  errorMessage: string = '';
  constructor(private http: HttpClient, private router: Router) { }

  ngOnInit() {}
  onSubmit(event: Event) {
    event.preventDefault();
  
    if (this.username && this.password) {
      //const url = 'https://progRilieviPerizie.onrender.com/api/login';
      const url = 'http://localhost:3000/api/login';
      const body = {
        username: this.username, 
        password: this.password, 
      };
  
      this.http.post(url, body).subscribe({
        next: (response: any) => {
          console.log('Risposta dal server:', response);
  
          if (response.token) {
            localStorage.setItem('authToken', response.token);
            console.log('Token salvato:', response.token);
          }
  
          if (response.redPage === '/dashboard.html') {
            alert('Admin può accedere solo da computer');
            console.log('dentro admin');
          } else if (response.redPage === '/dashboard-utente.html') {
            this.router.navigateByUrl('/dashboard', { replaceUrl: true });
            console.log('dentro utente');
          } else if (response.redPage === '/cambia-password.html') {
            this.router.navigateByUrl('/cambia-password', { replaceUrl: true });
          } else {
            this.errorMessage = 'Risorsa non riconosciuta.';
          }
        },
        error: (err:any) => {
          console.error('Errore durante il login:', err);
          this.errorMessage = 'Credenziali non valide o errore del server.';
        },
      });
    } else {
      this.errorMessage = 'Tutti i campi sono obbligatori!';
    }
  }
}
