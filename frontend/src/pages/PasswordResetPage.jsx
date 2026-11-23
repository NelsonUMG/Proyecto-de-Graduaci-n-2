import { useState } from 'react';
import { ArrowRight, CheckCircle2, KeyRound, ShieldCheck } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, getApiError } from '../services/api';

const portalNames = {
  cliente: 'Portal de clientes',
  empleado: 'Acceso del personal',
};

export default function PasswordResetPage({ portal }) {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [error, setError] = useState(token ? '' : 'El enlace de recuperación no contiene un token válido.');
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('La confirmación de la clave no coincide.');
      return;
    }

    setLoading(true);
    try {
      await api.resetPassword({ token, ...form });
      setCompleted(true);
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="reset-screen">
      <section className="reset-panel">
        <div className="login-brand">
          <img className="login-logo" src="/brand/ganadero-logo.png" alt="Logotipo El Ganadero" />
          <div><span>{portalNames[portal]}</span><h1>Restablecer clave</h1></div>
        </div>

        {completed ? (
          <div className="reset-completed">
            <CheckCircle2 size={42} />
            <h2>Clave actualizada</h2>
            <p>Las sesiones anteriores fueron cerradas. Ya puede ingresar con su nueva clave.</p>
            <Link className="primary-button" to={`/${portal}/acceso`}>Ir al acceso<ArrowRight size={18} /></Link>
          </div>
        ) : (
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="reset-security"><ShieldCheck size={19} /><span>El enlace vence y solo puede utilizarse una vez.</span></div>
            <label><span>Nueva clave</span><div className="underlined-input"><KeyRound size={18} /><input type="password" minLength={10} autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} title="Mínimo 10 caracteres con mayúscula, minúscula, número y símbolo" required /></div></label>
            <label><span>Confirmar nueva clave</span><div className="underlined-input"><KeyRound size={18} /><input type="password" minLength={10} autoComplete="new-password" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} required /></div></label>
            {error ? <p className="form-error" role="alert">{error}</p> : null}
            <button type="submit" disabled={loading || !token}>{loading ? 'Actualizando...' : 'Guardar nueva clave'}<ArrowRight size={18} /></button>
          </form>
        )}
      </section>
    </main>
  );
}
