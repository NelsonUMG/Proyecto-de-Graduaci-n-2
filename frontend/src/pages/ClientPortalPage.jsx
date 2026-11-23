import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarPlus, Pencil, PawPrint, Save, UserRound } from 'lucide-react';
import DataTable from '../components/DataTable';
import { RiskBadge, StatusBadge } from '../components/Badges';
import { Field, SelectInput, TextArea, TextInput } from '../components/FormFields';
import { api, getApiError } from '../services/api';
import { clinicToday } from '../utils/format';
import { useAuth } from '../hooks/useAuth';

const emptyPortal = {
  client: null,
  pets: [],
  appointments: [],
  species: [],
  breeds: [],
  riskLevels: [],
  config: null,
};

export default function ClientPortalPage() {
  const { refreshUser } = useAuth();
  const [portal, setPortal] = useState(emptyPortal);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileForm, setProfileForm] = useState({ nombre: '', telefono: '', correo: '', direccion: '' });
  const [petForm, setPetForm] = useState({
    nombre: '',
    especieId: '',
    razaId: '',
    sexo: 'Macho',
    peso: '',
    color: '',
    fechaNacimiento: '',
    observaciones: '',
  });
  const [appointmentForm, setAppointmentForm] = useState({
    mascotaId: '',
    fecha: clinicToday(),
    hora: '09:00',
    motivo: '',
    sintomas: '',
  });

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    return api
      .get('/portal/summary')
      .then((data) => setPortal({ ...emptyPortal, ...data }))
      .catch((requestError) => setError(getApiError(requestError)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [load]);

  const breeds = useMemo(
    () => portal.breeds.filter((breed) => String(breed.especieId) === String(petForm.especieId)),
    [portal.breeds, petForm.especieId],
  );

  const submitPet = async (event) => {
    event.preventDefault();
    setNotice('');
    await api.post('/portal/pets', {
      ...petForm,
      especieId: Number(petForm.especieId),
      razaId: petForm.razaId ? Number(petForm.razaId) : null,
      peso: petForm.peso ? Number(petForm.peso) : null,
      fechaNacimiento: petForm.fechaNacimiento || null,
    });
    setPetForm({
      nombre: '',
      especieId: '',
      razaId: '',
      sexo: 'Macho',
      peso: '',
      color: '',
      fechaNacimiento: '',
      observaciones: '',
    });
    setNotice('Mascota registrada correctamente.');
    await load();
  };

  const submitAppointment = async (event) => {
    event.preventDefault();
    setNotice('');
    await api.post('/portal/appointments', {
      ...appointmentForm,
      mascotaId: Number(appointmentForm.mascotaId),
      sintomas: appointmentForm.sintomas.split(',').map((item) => item.trim()).filter(Boolean),
    });
    setAppointmentForm({
      mascotaId: '',
      fecha: appointmentForm.fecha,
      hora: appointmentForm.hora,
      motivo: '',
      sintomas: '',
    });
    setNotice('Cita solicitada correctamente. La clinica podra confirmarla desde agenda.');
    await load();
  };

  const editProfile = () => {
    if (!portal.client) return;
    setProfileForm({
      nombre: portal.client.nombre || '',
      telefono: portal.client.telefono || '',
      correo: portal.client.correo || '',
      direccion: portal.client.direccion || '',
    });
    setProfileError('');
    setEditingProfile(true);
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    setProfileError('');
    setNotice('');
    try {
      const client = await api.put('/portal/profile', profileForm);
      setPortal((current) => ({ ...current, client }));
      await refreshUser();
      setEditingProfile(false);
      setNotice('Tus datos se actualizaron correctamente.');
    } catch (requestError) {
      setProfileError(getApiError(requestError));
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="page-stack client-portal">
      <div className="page-header">
        <div className="header-icon"><UserRound size={22} /></div>
        <div>
          <h2>Portal del cliente</h2>
          <p>{portal.client ? portal.client.nombre : 'Cuenta vinculada a cliente'}</p>
        </div>
      </div>

      {error ? <div className="notice danger">{error}</div> : null}
      {notice ? <div className="notice success">{notice}</div> : null}
      {loading ? <div className="notice">Cargando portal...</div> : null}

      <section className="content-grid portal-actions">
        <form className="panel form-panel" onSubmit={submitPet}>
          <div className="section-title">
            <h3>Mi mascota</h3>
            <PawPrint size={18} />
          </div>
          <Field label="Nombre">
            <TextInput value={petForm.nombre} onChange={(e) => setPetForm({ ...petForm, nombre: e.target.value })} required />
          </Field>
          <Field label="Especie">
            <SelectInput value={petForm.especieId} onChange={(e) => setPetForm({ ...petForm, especieId: e.target.value, razaId: '' })} required>
              <option value="">Seleccione</option>
              {portal.species.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
            </SelectInput>
          </Field>
          <Field label="Raza">
            <SelectInput value={petForm.razaId} onChange={(e) => setPetForm({ ...petForm, razaId: e.target.value })}>
              <option value="">Sin raza</option>
              {breeds.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
            </SelectInput>
          </Field>
          <Field label="Sexo">
            <SelectInput value={petForm.sexo} onChange={(e) => setPetForm({ ...petForm, sexo: e.target.value })}>
              <option>Macho</option>
              <option>Hembra</option>
              <option>No especificado</option>
            </SelectInput>
          </Field>
          <Field label="Peso (kg)">
            <TextInput type="number" min="0" step="0.01" value={petForm.peso} onChange={(e) => setPetForm({ ...petForm, peso: e.target.value })} />
          </Field>
          <Field label="Fecha nacimiento">
            <TextInput type="date" value={petForm.fechaNacimiento} onChange={(e) => setPetForm({ ...petForm, fechaNacimiento: e.target.value })} />
          </Field>
          <Field label="Observaciones">
            <TextArea value={petForm.observaciones} onChange={(e) => setPetForm({ ...petForm, observaciones: e.target.value })} />
          </Field>
          <button className="primary-button" type="submit">
            <Save size={18} />
            Guardar mascota
          </button>
        </form>

        <form className="panel form-panel" onSubmit={submitAppointment}>
          <div className="section-title">
            <h3>Solicitar cita</h3>
            <CalendarPlus size={18} />
          </div>
          <Field label="Paciente">
            <SelectInput value={appointmentForm.mascotaId} onChange={(e) => setAppointmentForm({ ...appointmentForm, mascotaId: e.target.value })} required>
              <option value="">{portal.pets.length ? 'Seleccione mascota' : 'Registre una mascota primero'}</option>
              {portal.pets.map((pet) => <option key={pet.id} value={pet.id}>{pet.nombre}</option>)}
            </SelectInput>
          </Field>
          <Field label="Fecha">
            <TextInput type="date" min={clinicToday()} value={appointmentForm.fecha} onChange={(e) => setAppointmentForm({ ...appointmentForm, fecha: e.target.value })} required />
          </Field>
          <Field label="Hora">
            <TextInput type="time" value={appointmentForm.hora} onChange={(e) => setAppointmentForm({ ...appointmentForm, hora: e.target.value })} required />
          </Field>
          <Field label="Motivo">
            <TextArea value={appointmentForm.motivo} onChange={(e) => setAppointmentForm({ ...appointmentForm, motivo: e.target.value })} required />
          </Field>
          <Field label="Sintomas separados por coma">
            <TextInput value={appointmentForm.sintomas} onChange={(e) => setAppointmentForm({ ...appointmentForm, sintomas: e.target.value })} />
          </Field>
          <button className="primary-button" type="submit">
            <CalendarPlus size={18} />
            Solicitar cita
          </button>
        </form>

        <article className="panel client-card">
          <div className="section-title">
            <h3>Mis datos</h3>
            {!editingProfile ? <button className="secondary-button compact-button" type="button" onClick={editProfile} disabled={!portal.client}><Pencil size={16} /> Editar</button> : null}
          </div>
          {editingProfile ? (
            <form className="form-panel" onSubmit={saveProfile}>
              <Field label="Nombre"><TextInput value={profileForm.nombre} onChange={(e) => setProfileForm({ ...profileForm, nombre: e.target.value })} maxLength={120} required /></Field>
              <Field label="Telefono"><TextInput type="tel" value={profileForm.telefono} onChange={(e) => setProfileForm({ ...profileForm, telefono: e.target.value })} maxLength={30} required /></Field>
              <Field label="Correo"><TextInput type="email" value={profileForm.correo} onChange={(e) => setProfileForm({ ...profileForm, correo: e.target.value })} maxLength={160} required /></Field>
              <Field label="Direccion"><TextArea value={profileForm.direccion} onChange={(e) => setProfileForm({ ...profileForm, direccion: e.target.value })} maxLength={250} /></Field>
              {profileError ? <div className="notice danger" role="alert">{profileError}</div> : null}
              <div className="button-row">
                <button className="primary-button" type="submit" disabled={savingProfile}><Save size={16} /> {savingProfile ? 'Guardando...' : 'Guardar'}</button>
                <button className="secondary-button" type="button" onClick={() => { setEditingProfile(false); setProfileError(''); }} disabled={savingProfile}>Cancelar</button>
              </div>
            </form>
          ) : (
            <div className="client-profile">
              <strong>{portal.client?.nombre}</strong>
              <span>{portal.client?.telefono}</span>
              <span>{portal.client?.correo}</span>
              <span>{portal.client?.direccion}</span>
            </div>
          )}
        </article>
      </section>

      <section className="content-grid">
        <article className="panel">
          <h3>Mascotas registradas</h3>
          <DataTable
            rows={portal.pets}
            columns={[
              { key: 'nombre', label: 'Mascota' },
              { key: 'especie', label: 'Especie' },
              { key: 'raza', label: 'Raza' },
              { key: 'sexo', label: 'Sexo' },
            ]}
          />
        </article>
        <article className="panel span-2">
          <h3>Mis citas</h3>
          <DataTable
            rows={portal.appointments}
            columns={[
              { key: 'fecha', label: 'Fecha' },
              { key: 'hora', label: 'Hora' },
              { key: 'mascota', label: 'Mascota' },
              { key: 'riesgo', label: 'Riesgo', render: (row) => <RiskBadge risk={row.riesgo} /> },
              { key: 'estado', label: 'Estado', render: (row) => <StatusBadge value={row.estado} /> },
            ]}
          />
        </article>
      </section>
    </div>
  );
}
