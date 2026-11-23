import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BriefcaseMedical,
  Clock3,
  ExternalLink,
  HeartHandshake,
  KeyRound,
  LockKeyhole,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  UserPlus,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { api, getApiError } from '../services/api';
import { homeForUser } from '../routes/rolePaths';

const defaultClinicInfo = {
  nombreClinica: 'Clinica Veterinaria El Ganadero',
  direccion: '27 AV, 28 - 11, colonia Maya, zona 18, Guatemala City, Guatemala',
  telefono: '3603 9109',
  telefonoPetShop: '2255 3453',
  correoContacto: 'elganadero.veterinaria@gmail.com',
  facebookUrl: 'https://www.facebook.com/search/top?q=Agroveterinaria%20El%20Ganadero',
  horario: 'Lunes a viernes 8:00 AM - 6:00 PM, sabados 8:00 AM - 1:00 PM.',
};

const phoneDigits = (value) => String(value || '').replace(/\D/g, '');
const localPhone = (value) => {
  const digits = phoneDigits(value);
  return digits.length === 8 ? `502${digits}` : digits;
};

const portalConfig = {
  cliente: {
    apiPortal: 'client',
    label: 'Portal de clientes',
    title: 'Citas y mascotas',
    subtitle: 'Ingrese para administrar sus solicitudes.',
    icon: HeartHandshake,
  },
  empleado: {
    apiPortal: 'staff',
    label: 'Acceso del personal',
    title: 'Administración y operación clínica',
    subtitle: 'Ingrese con su cuenta de administrador o empleado.',
    icon: BriefcaseMedical,
  },
};

export default function LoginPage({ portal = 'cliente' }) {
  const config = portalConfig[portal] || portalConfig.cliente;
  const PortalIcon = config.icon;
  const { authReady, login, registerClient, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ usuario: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    nombre: '', telefono: '', direccion: '', usuario: '', email: '', password: '',
  });
  const [mode, setMode] = useState('login');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [clinicInfo, setClinicInfo] = useState(defaultClinicInfo);

  useEffect(() => {
    let active = true;
    api.publicClinic().then((information) => {
      if (active) setClinicInfo(information);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clinicInfo.direccion)}`;
  const whatsappPhone = localPhone(clinicInfo.telefono);
  const whatsappUrl = whatsappPhone.length === 11 && whatsappPhone.startsWith('502')
    ? `https://wa.me/${whatsappPhone}` : `tel:${whatsappPhone}`;

  if (!authReady) return <main className="route-loading">Validando sesion...</main>;
  if (isAuthenticated) return <Navigate to={homeForUser(user)} replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const authenticatedUser = await login(form, config.apiPortal);
      navigate(homeForUser(authenticatedUser), { replace: true });
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const registeredUser = await registerClient(registerForm);
      navigate(homeForUser(registeredUser), { replace: true });
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const result = await api.requestPasswordReset({ identifier: forgotIdentifier, portal });
      setNotice(result.message);
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError('');
    setNotice('');
  };

  return (
    <main className={`login-screen portal-${portal}`}>
      <div className="login-shell">
        <aside className="login-showcase" aria-label="Información de la clínica">
          <div className="showcase-banner">
            <img src="/brand/ganadero-clean-hero.png" alt="Imagen institucional de El Ganadero" />
          </div>
          <div className="showcase-content">
            <img className="showcase-logo" src="/brand/ganadero-logo.png" alt="Logotipo El Ganadero" />
            <span className="eyebrow">Veterinaria y Agropecuaria</span>
            <h1>{clinicInfo.nombreClinica}</h1>
            <p>Grooming, farmacia veterinaria, pet shop, productos agrícolas y atención clínica para mascotas.</p>
            <div className="showcase-contact">
              <a href={mapsUrl} target="_blank" rel="noreferrer">
                <MapPin size={19} /><span><strong>Ubicación</strong>{clinicInfo.direccion}</span><ExternalLink size={15} />
              </a>
              <a href={whatsappUrl} target="_blank" rel="noreferrer">
                <MessageCircle size={19} /><span><strong>WhatsApp</strong>Servicios veterinarios {clinicInfo.telefono}</span>
              </a>
              {clinicInfo.facebookUrl ? <a href={clinicInfo.facebookUrl} target="_blank" rel="noreferrer">
                <span className="facebook-glyph">f</span><span><strong>Facebook</strong>{clinicInfo.nombreClinica}</span><ExternalLink size={15} />
              </a> : null}
              <a href={`tel:+${localPhone(clinicInfo.telefonoPetShop)}`}>
                <Phone size={19} /><span><strong>Pet shop</strong>Tel: {clinicInfo.telefonoPetShop}</span>
              </a>
              <a href={`mailto:${clinicInfo.correoContacto}`}>
                <Mail size={19} /><span><strong>Correo</strong>{clinicInfo.correoContacto}</span>
              </a>
            </div>
            <div className="showcase-hours"><Clock3 size={18} /><span>{clinicInfo.horario}</span></div>
          </div>
        </aside>

        <section className="login-panel">
          <div className="login-brand">
            <img className="login-logo" src="/brand/ganadero-logo.png" alt="Logotipo El Ganadero" />
            <div><span>Software Veterinario</span><h1>{clinicInfo.nombreClinica}</h1></div>
          </div>

          <div className="portal-identity">
            <span className="portal-identity-icon"><PortalIcon size={21} /></span>
            <div><strong>{config.title}</strong><span>{config.label}</span></div>
          </div>
          <p className="portal-subtitle">{config.subtitle}</p>

          {portal === 'cliente' ? (
            <div className="auth-tabs" aria-label="Opciones de cliente">
              <button className={mode === 'login' ? 'active' : ''} type="button" onClick={() => switchMode('login')}>
                <ShieldCheck size={16} />Ingresar
              </button>
              <button className={mode === 'register' ? 'active' : ''} type="button" onClick={() => switchMode('register')}>
                <UserPlus size={16} />Crear cuenta
              </button>
            </div>
          ) : null}

          {mode === 'login' ? (
            <form onSubmit={handleSubmit} className="login-form">
              <label><span>Usuario o correo</span><div className="underlined-input"><UserRound size={18} /><input value={form.usuario} onChange={(event) => setForm({ ...form, usuario: event.target.value })} autoComplete="username" required /></div></label>
              <label><span>Clave</span><div className="underlined-input"><KeyRound size={18} /><input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} autoComplete="current-password" required /></div></label>
              <button className="forgot-link" type="button" onClick={() => switchMode('forgot')}>Olvidé mi clave</button>
              {error ? <p className="form-error" role="alert">{error}</p> : null}
              <button type="submit" disabled={loading}>{loading ? 'Validando...' : 'Ingresar'}<ArrowRight size={18} /></button>
            </form>
          ) : mode === 'forgot' ? (
            <form onSubmit={handleForgotPassword} className="login-form recovery-form">
              <div className="auth-recovery-title"><strong>Recuperar clave</strong><span>Recibirá un enlace de un solo uso.</span></div>
              <label><span>Usuario o correo</span><div className="underlined-input"><Mail size={18} /><input value={forgotIdentifier} onChange={(event) => setForgotIdentifier(event.target.value)} autoComplete="username" required /></div></label>
              {error ? <p className="form-error" role="alert">{error}</p> : null}
              {notice ? <p className="form-success" role="status">{notice}</p> : null}
              <button type="submit" disabled={loading}>{loading ? 'Enviando...' : 'Enviar enlace'}<ArrowRight size={18} /></button>
              <button className="forgot-link recovery-back" type="button" onClick={() => switchMode('login')}>Volver a iniciar sesión</button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="login-form register-form">
              <label><span>Nombre completo</span><div className="underlined-input"><UserRound size={18} /><input value={registerForm.nombre} onChange={(event) => setRegisterForm({ ...registerForm, nombre: event.target.value })} autoComplete="name" required /></div></label>
              <label><span>Teléfono</span><div className="underlined-input"><Phone size={18} /><input value={registerForm.telefono} onChange={(event) => setRegisterForm({ ...registerForm, telefono: event.target.value })} autoComplete="tel" required /></div></label>
              <label><span>Correo</span><div className="underlined-input"><Mail size={18} /><input type="email" value={registerForm.email} onChange={(event) => setRegisterForm({ ...registerForm, email: event.target.value })} autoComplete="email" required /></div></label>
              <label><span>Usuario</span><div className="underlined-input"><UserPlus size={18} /><input value={registerForm.usuario} onChange={(event) => setRegisterForm({ ...registerForm, usuario: event.target.value })} autoComplete="username" required /></div></label>
              <label><span>Dirección</span><div className="underlined-input"><MapPin size={18} /><input value={registerForm.direccion} onChange={(event) => setRegisterForm({ ...registerForm, direccion: event.target.value })} autoComplete="street-address" /></div></label>
              <label><span>Clave</span><div className="underlined-input"><KeyRound size={18} /><input type="password" value={registerForm.password} onChange={(event) => setRegisterForm({ ...registerForm, password: event.target.value })} autoComplete="new-password" minLength={10} title="Mínimo 10 caracteres con mayúscula, minúscula, número y símbolo" required /></div></label>
              {error ? <p className="form-error" role="alert">{error}</p> : null}
              <button type="submit" disabled={loading}>{loading ? 'Creando cuenta...' : 'Registrarme y agendar'}<ArrowRight size={18} /></button>
            </form>
          )}

          <div className="secure-access"><LockKeyhole size={17} /><span>Acceso protegido y verificado por rol</span></div>
        </section>
      </div>
    </main>
  );
}
