import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';

// shared module
import { SharedModule } from 'src/shared.module';

import { BoxedLockscreenComponent } from './boxed-lockscreen';
import { BoxedPasswordResetComponent } from './boxed-password-reset';
import { BoxedSigninComponent } from './boxed-signin';
import { BoxedSignupComponent } from './boxed-signup';
import { CoverLockscreenComponent } from './cover-lockscreen';
import { CoverLoginComponent } from './cover-login';
import { CoverPasswordResetComponent } from './cover-password-reset';
import { CoverRegisterComponent } from './cover-register';

const routes: Routes = [
    { path: 'auth/boxed-lockscreen', component: BoxedLockscreenComponent, data: { title: 'Boxed Lockscreen' } },
    {
        path: 'auth/boxed-password-reset',
        component: BoxedPasswordResetComponent,
        data: { title: 'Boxed Password Reset' },
    },
    { path: 'auth/boxed-signin', component: BoxedSigninComponent, data: { title: 'Boxed Signin' } },
    { path: 'auth/boxed-signup', component: BoxedSignupComponent, data: { title: 'Boxed Signup' } },
    { path: 'auth/cover-lockscreen', component: CoverLockscreenComponent, data: { title: 'Cover Lockscreen' } },
    { path: 'auth/cover-login', component: CoverLoginComponent, data: { title: 'Cover Login' } },
    {
        path: 'auth/cover-password-reset',
        component: CoverPasswordResetComponent,
        data: { title: 'Cover Password Reset' },
    },
    { path: 'auth/cover-register', component: CoverRegisterComponent, data: { title: 'Cover Register' } },
];
@NgModule({
    imports: [RouterModule.forChild(routes), CommonModule, SharedModule.forRoot()],
    declarations: [
        BoxedLockscreenComponent,
        BoxedPasswordResetComponent,
        BoxedSigninComponent,
        BoxedSignupComponent,
        CoverLockscreenComponent,
        CoverLoginComponent,
        CoverPasswordResetComponent,
        CoverRegisterComponent,
    ],
})
export class AuthModule {}
