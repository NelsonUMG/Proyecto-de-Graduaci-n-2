import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarPlus,
  Camera,
  FileText,
  PackagePlus,
  Plus,
  Printer,
  RefreshCw,
  Save,
  ShieldCheck,
  ShoppingCart,
  Stethoscope,
  Syringe,
  UserPlus,
} from 'lucide-react';
import DataTable from '../components/DataTable';
import { RiskBadge, StatusBadge } from '../components/Badges';
import { Field, SelectInput, TextArea, TextInput } from '../components/FormFields';
import { api, getApiError } from '../services/api';
import { clinicDateTime, clinicToday, money, toInputDate } from '../utils/format';

const emptyOptions = {
  clients: [],
  pets: [],
  species: [],
  breeds: [],
  riskLevels: [],
  products: [],
  services: [],
  users: [],
  roles: [],
  schedules: [],
  config: null,
};

const appointmentStatuses = ['Pendiente', 'Confirmada', 'En espera', 'En atencion', 'Atendida', 'Finalizada', 'Cancelada', 'No asistio'];
const treatmentStatuses = ['Activo', 'Finalizado', 'Suspendido'];
const formatRiskLevelForForm = (risk) => ({
  ...risk,
  keywordsText: Array.isArray(risk.keywords) ? risk.keywords.join('\n') : '',
});

function useOptions() {
  const [options, setOptions] = useState(emptyOptions);

  const load = () => api.options().then((data) => setOptions({ ...emptyOptions, ...data }));

  useEffect(() => {
    load().catch(() => setOptions(emptyOptions));
  }, []);

  return [options, load];
}

function useResource(url) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    return api
      .get(url)
      .then(setRows)
      .catch((requestError) => setError(getApiError(requestError)))
      .finally(() => setLoading(false));
  }, [url]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  return { rows, setRows, loading, error, load };
}

function PageHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="page-header">
      <div className="header-icon">{Icon ? <Icon size={22} /> : null}</div>
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

function SubmitButton({ children = 'Guardar', loading = false, icon = Save }) {
  const ButtonIcon = icon;

  return (
    <button className="primary-button" type="submit" disabled={loading}>
      <ButtonIcon size={18} />
      {loading ? 'Guardando...' : children}
    </button>
  );
}

function Notice({ error, loading }) {
  if (error) return <div className="notice danger">{error}</div>;
  if (loading) return <div className="notice">Cargando registros...</div>;
  return null;
}

export function ClientsPage() {
  const { rows, loading, error, load } = useResource('/clients');
  const [form, setForm] = useState({ nombre: '', telefono: '', dpi: '', correo: '', direccion: '' });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (editingId) await api.put(`/clients/${editingId}`, form);
      else await api.post('/clients', form);
      setForm({ nombre: '', telefono: '', dpi: '', correo: '', direccion: '' });
      setEditingId(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const edit = (row) => {
    setEditingId(row.id);
    setForm({ nombre: row.nombre || '', telefono: row.telefono || '', dpi: row.dpi || '', correo: row.correo || '', direccion: row.direccion || '' });
  };

  const deactivate = async (row) => {
    if (!window.confirm(`Desactivar al cliente ${row.nombre}?`)) return;
    await api.delete(`/clients/${row.id}`);
    await load();
  };

  return (
    <div className="page-stack">
      <PageHeader icon={UserPlus} title="Gestion de clientes" subtitle="Registro, busqueda y trazabilidad de duenos." />
      <section className="content-grid">
        <form className="panel form-panel" onSubmit={submit}>
          <Field label="Nombre">
            <TextInput value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
          </Field>
          <Field label="Telefono">
            <TextInput value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} required />
          </Field>
          <Field label="DPI opcional">
            <TextInput value={form.dpi} onChange={(e) => setForm({ ...form, dpi: e.target.value })} />
          </Field>
          <Field label="Correo">
            <TextInput type="email" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} />
          </Field>
          <Field label="Direccion">
            <TextArea value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
          </Field>
          <SubmitButton loading={saving} icon={editingId ? Save : Plus}>{editingId ? 'Guardar cambios' : 'Crear cliente'}</SubmitButton>
          {editingId ? <button className="secondary-button" type="button" onClick={() => { setEditingId(null); setForm({ nombre: '', telefono: '', dpi: '', correo: '', direccion: '' }); }}>Cancelar</button> : null}
        </form>

        <article className="panel span-2">
          <div className="section-title">
            <h3>Clientes registrados</h3>
            <button className="icon-button" type="button" onClick={load} title="Actualizar">
              <RefreshCw size={18} />
            </button>
          </div>
          <Notice error={error} loading={loading} />
          <DataTable
            rows={rows}
            columns={[
              { key: 'nombre', label: 'Nombre' },
              { key: 'telefono', label: 'Telefono' },
              { key: 'correo', label: 'Correo' },
              { key: 'direccion', label: 'Direccion' },
              { key: 'activo', label: 'Estado', render: (row) => <StatusBadge value={row.activo ? 'Activo' : 'Inactivo'} /> },
              { key: 'acciones', label: 'Acciones', render: (row) => <div className="table-actions"><button className="secondary-button compact-button" type="button" onClick={() => edit(row)}>Editar</button><button className="danger-button compact-button" type="button" onClick={() => deactivate(row)}>Desactivar</button></div> },
            ]}
          />
        </article>
      </section>
    </div>
  );
}

export function PetsPage() {
  const [options, reloadOptions] = useOptions();
  const { rows, loading, error, load } = useResource('/pets');
  const [form, setForm] = useState({
    clienteId: '',
    nombre: '',
    especieId: '',
    razaId: '',
    sexo: 'Macho',
    peso: '',
    color: '',
    fechaNacimiento: '',
    observaciones: '',
    fotoUrl: '',
  });
  const breeds = options.breeds.filter((breed) => String(breed.especieId) === String(form.especieId));
  const [editingId, setEditingId] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoError, setPhotoError] = useState('');
  const [saving, setSaving] = useState(false);
  const photoInputRef = useRef(null);
  const photoPreview = useMemo(() => photoFile ? URL.createObjectURL(photoFile) : '', [photoFile]);
  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview); }, [photoPreview]);

  const resetPhoto = () => {
    setPhotoFile(null);
    setPhotoError('');
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const selectPhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setPhotoError('Seleccione una fotografia JPG, PNG o WebP.');
      setPhotoFile(null);
      event.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('La fotografia debe pesar 5 MB o menos.');
      setPhotoFile(null);
      event.target.value = '';
      return;
    }
    setPhotoError('');
    setPhotoFile(file);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    const payload = {
      clienteId: Number(form.clienteId),
      nombre: form.nombre,
      especieId: Number(form.especieId),
      razaId: form.razaId ? Number(form.razaId) : null,
      sexo: form.sexo,
      peso: form.peso ? Number(form.peso) : null,
      color: form.color,
      fechaNacimiento: form.fechaNacimiento || null,
      observaciones: form.observaciones,
    };
    setSaving(true);
    try {
      let petId = editingId;
      if (petId) await api.put(`/pets/${petId}`, payload);
      else {
        const created = await api.post('/pets', payload);
        petId = created.id;
        setEditingId(petId);
      }
      if (photoFile) await api.uploadPetPhoto(petId, photoFile);
      setForm({ clienteId: '', nombre: '', especieId: '', razaId: '', sexo: 'Macho', peso: '', color: '', fechaNacimiento: '', observaciones: '', fotoUrl: '' });
      resetPhoto();
      setEditingId(null);
      await Promise.all([load(), reloadOptions()]);
    } finally {
      setSaving(false);
    }
  };

  const edit = (row) => {
    resetPhoto();
    setEditingId(row.id);
    setForm({
      clienteId: String(row.clienteId), nombre: row.nombre || '', especieId: String(row.especieId),
      razaId: row.razaId ? String(row.razaId) : '', sexo: row.sexo || 'No especificado',
      peso: row.peso ?? '', color: row.color || '', fechaNacimiento: row.fechaNacimiento || '',
      observaciones: row.observaciones || '', fotoUrl: row.fotoUrl || '',
    });
  };

  const deactivate = async (row) => {
    if (!window.confirm(`Desactivar a ${row.nombre}?`)) return;
    await api.delete(`/pets/${row.id}`);
    await Promise.all([load(), reloadOptions()]);
  };

  return (
    <div className="page-stack">
      <PageHeader icon={Stethoscope} title="Registro Mascota" subtitle="Ficha inicial del paciente y datos del duenio." />
      <form className="panel form-panel reference-form-card" onSubmit={submit}>
        <div className="form-section-heading">
          <h3>Informacion General</h3>
          <span>Datos clinicos principales</span>
        </div>
        <div className="reference-form-grid pet-reference-grid">
          <div className="reference-fields">
            <Field label="Nombre">
              <TextInput value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
            </Field>
            <Field label="Fecha Nacimiento">
              <TextInput type="date" value={form.fechaNacimiento} onChange={(e) => setForm({ ...form, fechaNacimiento: e.target.value })} />
            </Field>
            <Field label="Especie">
              <SelectInput value={form.especieId} onChange={(e) => setForm({ ...form, especieId: e.target.value, razaId: '' })} required>
                <option value="">Seleccione</option>
                {options.species.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
              </SelectInput>
            </Field>
            <Field label="Raza">
              <SelectInput value={form.razaId} onChange={(e) => setForm({ ...form, razaId: e.target.value })}>
                <option value="">Sin raza</option>
                {breeds.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
              </SelectInput>
            </Field>
            <Field label="Peso (Kg)">
              <TextInput type="number" min="0" step="0.01" value={form.peso} onChange={(e) => setForm({ ...form, peso: e.target.value })} />
            </Field>
            <Field label="Color">
              <TextInput value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
            </Field>
            <Field label="Sexo">
              <SelectInput value={form.sexo} onChange={(e) => setForm({ ...form, sexo: e.target.value })}>
                <option>Hembra</option>
                <option>Macho</option>
                <option>No especificado</option>
              </SelectInput>
            </Field>
            <Field label="Duenio">
              <SelectInput value={form.clienteId} onChange={(e) => setForm({ ...form, clienteId: e.target.value })} required>
                <option value="">Seleccione</option>
                {options.clients.map((client) => <option key={client.id} value={client.id}>{client.nombre}</option>)}
              </SelectInput>
            </Field>
            <Field label="Inf. Adicional">
              <TextArea value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} />
            </Field>
          </div>
          <aside className="photo-side">
            <div className="photo-title">
              <Camera size={20} />
              <strong>Foto de perfil</strong>
            </div>
            <div className="photo-placeholder">
              {photoPreview || form.fotoUrl ? <img src={photoPreview || form.fotoUrl} alt="Vista previa de la mascota" /> : <Camera size={38} />}
            </div>
            <Field label="Subir fotografia">
              <input ref={photoInputRef} className="photo-file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={selectPhoto} />
            </Field>
            <small>JPG, PNG o WebP. Maximo 5 MB.</small>
            {photoError ? <p className="photo-error" role="alert">{photoError}</p> : null}
          </aside>
        </div>
        <div className="center-actions">
          <SubmitButton icon={editingId ? Save : Plus} loading={saving}>{editingId ? 'Guardar cambios' : 'Guardar'}</SubmitButton>
          {editingId ? <button className="secondary-button" type="button" onClick={() => { resetPhoto(); setEditingId(null); setForm({ clienteId: '', nombre: '', especieId: '', razaId: '', sexo: 'Macho', peso: '', color: '', fechaNacimiento: '', observaciones: '', fotoUrl: '' }); }}>Cancelar</button> : null}
        </div>
      </form>

      <section className="content-grid">
        <article className="panel span-2">
          <div className="section-title">
            <h3>Pacientes registrados</h3>
            <button className="icon-button" type="button" onClick={load} title="Actualizar"><RefreshCw size={18} /></button>
          </div>
          <Notice error={error} loading={loading} />
          <DataTable
            rows={rows}
            columns={[
              { key: 'nombre', label: 'Mascota' },
              { key: 'cliente', label: 'Duenio' },
              { key: 'especie', label: 'Especie' },
              { key: 'raza', label: 'Raza' },
              { key: 'sexo', label: 'Sexo' },
              { key: 'peso', label: 'Peso' },
              { key: 'acciones', label: 'Acciones', render: (row) => <div className="table-actions"><button className="secondary-button compact-button" type="button" onClick={() => edit(row)}>Editar</button><button className="danger-button compact-button" type="button" onClick={() => deactivate(row)}>Desactivar</button></div> },
            ]}
          />
        </article>
      </section>
    </div>
  );
}

export function AppointmentsPage() {
  const [options, reloadOptions] = useOptions();
  const { rows, loading, error, load } = useResource('/appointments');
  const [form, setForm] = useState({
    clienteId: '',
    mascotaId: '',
    fecha: clinicToday(),
    hora: '09:00',
    motivo: '',
    sintomas: '',
    nivelRiesgoId: '',
    estado: 'Pendiente',
  });
  const [triage, setTriage] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const pets = options.pets.filter((pet) => String(pet.clienteId) === String(form.clienteId));

  const classify = async () => {
    const result = await api.post('/triage/classify', {
      sintomas: form.sintomas.split(',').map((item) => item.trim()).filter(Boolean),
      motivo: form.motivo,
      nivelRiesgoId: form.nivelRiesgoId ? Number(form.nivelRiesgoId) : undefined,
    });
    setTriage(result);
    setForm({ ...form, nivelRiesgoId: String(result.nivelRiesgoId) });
  };

  const submit = async (event) => {
    event.preventDefault();
    const payload = {
      ...form,
      clienteId: Number(form.clienteId),
      mascotaId: Number(form.mascotaId),
      nivelRiesgoId: form.nivelRiesgoId ? Number(form.nivelRiesgoId) : undefined,
      sintomas: form.sintomas.split(',').map((item) => item.trim()).filter(Boolean),
    };
    if (editingId) await api.put(`/appointments/${editingId}`, payload);
    else await api.post('/appointments', payload);
    setTriage(null);
    setForm({ ...form, mascotaId: '', motivo: '', sintomas: '', nivelRiesgoId: '', estado: 'Pendiente' });
    setEditingId(null);
    await Promise.all([load(), reloadOptions()]);
  };

  const changeStatus = async (row, estado) => {
    await api.patch(`/appointments/${row.id}/status`, { estado });
    await load();
  };

  const updateTriage = async () => {
    await api.patch(`/appointments/${editingId}/triage`, {
      sintomas: form.sintomas.split(',').map((item) => item.trim()).filter(Boolean),
      motivo: form.motivo,
      nivelRiesgoId: form.nivelRiesgoId ? Number(form.nivelRiesgoId) : undefined,
    });
    await load();
  };

  const editAppointment = (row) => {
    setEditingId(row.id);
    setForm({
      clienteId: String(row.clienteId), mascotaId: String(row.mascotaId), fecha: row.fecha,
      hora: row.hora, motivo: row.motivo, sintomas: (row.sintomas || []).join(', '),
      nivelRiesgoId: String(row.nivelRiesgoId), estado: row.estado,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="page-stack">
      <PageHeader icon={CalendarPlus} title="Cita" subtitle="Agenda de pacientes, disponibilidad y triaje veterinario." />
      <form className="panel form-panel reference-form-card appointment-form-card" onSubmit={submit}>
        <div className="form-section-heading">
          <h3>{editingId ? `Editar cita #${editingId}` : 'Agendar cita'}</h3>
          <span>Validacion de horario y prioridad clinica</span>
          {options.schedules.length ? <small>{options.schedules.map((item) => `${item.diaSemana} ${item.horaInicio}-${item.horaFin}`).join(' · ')}</small> : null}
        </div>
        <div className="appointment-reference-grid">
          <Field label="Cliente">
            <SelectInput value={form.clienteId} onChange={(e) => setForm({ ...form, clienteId: e.target.value, mascotaId: '' })} required>
              <option value="">Seleccione cliente</option>
              {options.clients.map((client) => <option key={client.id} value={client.id}>{client.nombre}</option>)}
            </SelectInput>
          </Field>
          <Field label="Paciente">
            <SelectInput value={form.mascotaId} onChange={(e) => setForm({ ...form, mascotaId: e.target.value })} required>
              <option value="">{form.clienteId ? 'Seleccione paciente' : 'Seleccione cliente primero'}</option>
              {pets.map((pet) => <option key={pet.id} value={pet.id}>{pet.nombre}</option>)}
            </SelectInput>
          </Field>
          <Field label="Fecha">
            <TextInput type="date" min={clinicToday()} value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} required />
          </Field>
          <Field label="Hora">
            <TextInput type="time" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} required />
          </Field>
          <Field label="Motivo Cita">
            <TextArea value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} required />
          </Field>
          <Field label="Sintomas separados por coma">
            <TextInput value={form.sintomas} onChange={(e) => setForm({ ...form, sintomas: e.target.value })} />
          </Field>
          <Field label="Nivel de riesgo">
            <SelectInput value={form.nivelRiesgoId} onChange={(e) => setForm({ ...form, nivelRiesgoId: e.target.value })}>
              <option value="">Sugerir automaticamente</option>
              {options.riskLevels.map((risk) => (
                <option key={risk.id} value={risk.id}>
                  {risk.nombre}{risk.tiempoAtencion ? ` - ${risk.tiempoAtencion}` : ''}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
        <div className="center-actions">
          <button className="secondary-button" type="button" onClick={classify}>Clasificar riesgo</button>
          {editingId ? <button className="secondary-button" type="button" onClick={updateTriage}>Actualizar triaje</button> : null}
          <SubmitButton icon={editingId ? Save : Plus}>{editingId ? 'Guardar cambios' : 'Agendar'}</SubmitButton>
          {editingId ? <button className="secondary-button" type="button" onClick={() => { setEditingId(null); setForm({ clienteId: '', mascotaId: '', fecha: clinicToday(), hora: '09:00', motivo: '', sintomas: '', nivelRiesgoId: '', estado: 'Pendiente' }); setTriage(null); }}>Cancelar edicion</button> : null}
        </div>
        {triage ? (
          <div className="notice success triage-result">
            <span>Nivel sugerido: <RiskBadge risk={triage.riesgo} /></span>
            {triage.tiempoAtencion ? <strong>Tiempo sugerido: {triage.tiempoAtencion}</strong> : null}
            {triage.matchedKeyword ? (
              <span>
                Coincidencia {triage.matchType === 'aproximada' ? 'aproximada' : 'exacta'}: {triage.matchedKeyword}
                {triage.matchedText && triage.matchedText !== triage.matchedKeyword ? ` (${triage.matchedText})` : ''}
              </span>
            ) : (
              <span>Sin coincidencia; se uso el nivel base no urgente.</span>
            )}
          </div>
        ) : null}
      </form>

      <section className="content-grid">
        <article className="panel span-2">
          <div className="section-title">
            <h3>Citas registradas</h3>
            <button className="icon-button" type="button" onClick={load} title="Actualizar"><RefreshCw size={18} /></button>
          </div>
          <Notice error={error} loading={loading} />
          <DataTable
            rows={rows}
            columns={[
              { key: 'fecha', label: 'Fecha' },
              { key: 'hora', label: 'Hora' },
              { key: 'cliente', label: 'Cliente' },
              { key: 'mascota', label: 'Mascota' },
              { key: 'riesgo', label: 'Riesgo', render: (row) => <RiskBadge risk={row.riesgo} /> },
              { key: 'estado', label: 'Estado', render: (row) => <StatusBadge value={row.estado} /> },
              {
                key: 'acciones',
                label: 'Acciones',
                render: (row) => (
                  <div className="table-actions">
                    <SelectInput className="table-select" value={row.estado} onChange={(event) => changeStatus(row, event.target.value)} aria-label={`Cambiar estado de cita ${row.id}`}>
                      {appointmentStatuses.map((status) => <option key={status}>{status}</option>)}
                    </SelectInput>
                    <button className="secondary-button compact-button" type="button" onClick={() => editAppointment(row)}>Editar</button>
                  </div>
                ),
              },
            ]}
          />
        </article>
      </section>
    </div>
  );
}

export function ClinicalPage() {
  const [options] = useOptions();
  const appointments = useResource('/appointments');
  const histories = useResource('/clinical-records');
  const treatments = useResource('/treatments');
  const vaccines = useResource('/vaccines');
  const [historyForm, setHistoryForm] = useState({ mascotaId: '', clienteId: '', citaId: '', motivoConsulta: '', sintomas: '', diagnostico: '', tratamiento: '', medicamentos: '', observaciones: '', proximaCita: '' });
  const [treatmentForm, setTreatmentForm] = useState({ mascotaId: '', estado: 'Activo', fechaInicio: toInputDate(new Date().toISOString()), fechaFin: '', medicamentoServicio: '', dosisIndicaciones: '', observaciones: '', seguimiento: '' });
  const [vaccineForm, setVaccineForm] = useState({ mascotaId: '', nombreVacuna: '', fechaAplicacion: toInputDate(new Date().toISOString()), proximaDosis: '', lote: '', fechaVencimientoProducto: '', observaciones: '' });
  const [editingHistoryId, setEditingHistoryId] = useState(null);
  const [editingTreatmentId, setEditingTreatmentId] = useState(null);
  const [editingVaccineId, setEditingVaccineId] = useState(null);

  const submitHistory = async (event) => {
    event.preventDefault();
    const payload = {
      ...historyForm,
      mascotaId: Number(historyForm.mascotaId),
      clienteId: Number(historyForm.clienteId),
      citaId: historyForm.citaId ? Number(historyForm.citaId) : null,
      proximaCita: historyForm.proximaCita || null,
    };
    if (editingHistoryId) await api.put(`/clinical-records/${editingHistoryId}`, payload);
    else await api.post('/clinical-records', payload);
    setHistoryForm({ mascotaId: '', clienteId: '', citaId: '', motivoConsulta: '', sintomas: '', diagnostico: '', tratamiento: '', medicamentos: '', observaciones: '', proximaCita: '' });
    setEditingHistoryId(null);
    histories.load();
  };

  const submitTreatment = async (event) => {
    event.preventDefault();
    const payload = { ...treatmentForm, mascotaId: Number(treatmentForm.mascotaId), fechaFin: treatmentForm.fechaFin || null };
    if (editingTreatmentId) await api.put(`/treatments/${editingTreatmentId}`, payload);
    else await api.post('/treatments', payload);
    setTreatmentForm({ mascotaId: '', estado: 'Activo', fechaInicio: toInputDate(new Date().toISOString()), fechaFin: '', medicamentoServicio: '', dosisIndicaciones: '', observaciones: '', seguimiento: '' });
    setEditingTreatmentId(null);
    treatments.load();
  };

  const changeTreatmentStatus = async (row, estado) => {
    await api.put(`/treatments/${row.id}`, {
      ...row,
      estado,
      mascotaId: Number(row.mascotaId),
      fechaFin: row.fechaFin || null,
    });
    await treatments.load();
  };

  const submitVaccine = async (event) => {
    event.preventDefault();
    const payload = {
      ...vaccineForm,
      mascotaId: Number(vaccineForm.mascotaId),
      proximaDosis: vaccineForm.proximaDosis || null,
      fechaVencimientoProducto: vaccineForm.fechaVencimientoProducto || null,
    };
    if (editingVaccineId) await api.put(`/vaccines/${editingVaccineId}`, payload);
    else await api.post('/vaccines', payload);
    setVaccineForm({ mascotaId: '', nombreVacuna: '', fechaAplicacion: toInputDate(new Date().toISOString()), proximaDosis: '', lote: '', fechaVencimientoProducto: '', observaciones: '' });
    setEditingVaccineId(null);
    vaccines.load();
  };

  const removeClinical = async (resource, row, reload) => {
    if (!window.confirm('Desactivar este registro clinico?')) return;
    await api.delete(`/${resource}/${row.id}`);
    await reload();
  };

  return (
    <div className="page-stack">
      <PageHeader icon={FileText} title="Modulo clinico" subtitle="Historial, tratamientos y vacunas con eliminacion logica." />
      <section className="triple-grid">
        <form className="panel form-panel" onSubmit={submitHistory}>
          <h3>Historial clinico</h3>
          <Field label="Mascota">
            <SelectInput value={historyForm.mascotaId} onChange={(e) => {
              const pet = options.pets.find((item) => String(item.id) === e.target.value);
              setHistoryForm({ ...historyForm, mascotaId: e.target.value, clienteId: pet?.clienteId || '' });
            }} required>
              <option value="">Seleccione</option>
              {options.pets.map((pet) => <option key={pet.id} value={pet.id}>{pet.nombre}</option>)}
            </SelectInput>
          </Field>
          <Field label="Cita relacionada (opcional)"><SelectInput value={historyForm.citaId} onChange={(e) => setHistoryForm({ ...historyForm, citaId: e.target.value })}><option value="">Sin cita</option>{appointments.rows.filter((item) => String(item.mascotaId) === String(historyForm.mascotaId)).map((item) => <option key={item.id} value={item.id}>#{item.id} · {item.fecha} {item.hora}</option>)}</SelectInput></Field>
          <Field label="Motivo"><TextInput value={historyForm.motivoConsulta} onChange={(e) => setHistoryForm({ ...historyForm, motivoConsulta: e.target.value })} required /></Field>
          <Field label="Diagnostico"><TextArea value={historyForm.diagnostico} onChange={(e) => setHistoryForm({ ...historyForm, diagnostico: e.target.value })} /></Field>
          <Field label="Tratamiento"><TextArea value={historyForm.tratamiento} onChange={(e) => setHistoryForm({ ...historyForm, tratamiento: e.target.value })} /></Field>
          <SubmitButton icon={editingHistoryId ? Save : Plus}>{editingHistoryId ? 'Guardar historial' : 'Registrar historial'}</SubmitButton>
          {editingHistoryId ? <button className="secondary-button" type="button" onClick={() => { setEditingHistoryId(null); setHistoryForm({ mascotaId: '', clienteId: '', citaId: '', motivoConsulta: '', sintomas: '', diagnostico: '', tratamiento: '', medicamentos: '', observaciones: '', proximaCita: '' }); }}>Cancelar</button> : null}
        </form>

        <form className="panel form-panel" onSubmit={submitTreatment}>
          <h3>Tratamiento</h3>
          <Field label="Mascota"><SelectInput value={treatmentForm.mascotaId} onChange={(e) => setTreatmentForm({ ...treatmentForm, mascotaId: e.target.value })} required><option value="">Seleccione</option>{options.pets.map((pet) => <option key={pet.id} value={pet.id}>{pet.nombre}</option>)}</SelectInput></Field>
          <Field label="Estado"><SelectInput value={treatmentForm.estado} onChange={(e) => setTreatmentForm({ ...treatmentForm, estado: e.target.value })}><option>Activo</option><option>Finalizado</option><option>Suspendido</option></SelectInput></Field>
          <Field label="Inicio"><TextInput type="date" value={treatmentForm.fechaInicio} onChange={(e) => setTreatmentForm({ ...treatmentForm, fechaInicio: e.target.value })} required /></Field>
          <Field label="Fin (opcional)"><TextInput type="date" min={treatmentForm.fechaInicio} value={treatmentForm.fechaFin} onChange={(e) => setTreatmentForm({ ...treatmentForm, fechaFin: e.target.value })} /></Field>
          <Field label="Medicamento o servicio"><TextInput value={treatmentForm.medicamentoServicio} onChange={(e) => setTreatmentForm({ ...treatmentForm, medicamentoServicio: e.target.value })} required /></Field>
          <Field label="Indicaciones"><TextArea value={treatmentForm.dosisIndicaciones} onChange={(e) => setTreatmentForm({ ...treatmentForm, dosisIndicaciones: e.target.value })} /></Field>
          <Field label="Seguimiento"><TextArea value={treatmentForm.seguimiento} onChange={(e) => setTreatmentForm({ ...treatmentForm, seguimiento: e.target.value })} /></Field>
          <SubmitButton icon={editingTreatmentId ? Save : Stethoscope}>{editingTreatmentId ? 'Guardar tratamiento' : 'Registrar tratamiento'}</SubmitButton>
          {editingTreatmentId ? <button className="secondary-button" type="button" onClick={() => { setEditingTreatmentId(null); setTreatmentForm({ mascotaId: '', estado: 'Activo', fechaInicio: clinicToday(), fechaFin: '', medicamentoServicio: '', dosisIndicaciones: '', observaciones: '', seguimiento: '' }); }}>Cancelar</button> : null}
        </form>

        <form className="panel form-panel" onSubmit={submitVaccine}>
          <h3>Vacuna</h3>
          <Field label="Mascota"><SelectInput value={vaccineForm.mascotaId} onChange={(e) => setVaccineForm({ ...vaccineForm, mascotaId: e.target.value })} required><option value="">Seleccione</option>{options.pets.map((pet) => <option key={pet.id} value={pet.id}>{pet.nombre}</option>)}</SelectInput></Field>
          <Field label="Nombre vacuna"><TextInput value={vaccineForm.nombreVacuna} onChange={(e) => setVaccineForm({ ...vaccineForm, nombreVacuna: e.target.value })} required /></Field>
          <Field label="Aplicacion"><TextInput type="date" value={vaccineForm.fechaAplicacion} onChange={(e) => setVaccineForm({ ...vaccineForm, fechaAplicacion: e.target.value })} required /></Field>
          <Field label="Proxima dosis"><TextInput type="date" min={vaccineForm.fechaAplicacion} value={vaccineForm.proximaDosis} onChange={(e) => setVaccineForm({ ...vaccineForm, proximaDosis: e.target.value })} /></Field>
          <Field label="Lote"><TextInput value={vaccineForm.lote} onChange={(e) => setVaccineForm({ ...vaccineForm, lote: e.target.value })} /></Field>
          <Field label="Vencimiento del producto"><TextInput type="date" min={vaccineForm.fechaAplicacion} value={vaccineForm.fechaVencimientoProducto} onChange={(e) => setVaccineForm({ ...vaccineForm, fechaVencimientoProducto: e.target.value })} /></Field>
          <SubmitButton icon={editingVaccineId ? Save : Syringe}>{editingVaccineId ? 'Guardar vacuna' : 'Registrar vacuna'}</SubmitButton>
          {editingVaccineId ? <button className="secondary-button" type="button" onClick={() => { setEditingVaccineId(null); setVaccineForm({ mascotaId: '', nombreVacuna: '', fechaAplicacion: clinicToday(), proximaDosis: '', lote: '', fechaVencimientoProducto: '', observaciones: '' }); }}>Cancelar</button> : null}
        </form>
      </section>

      <section className="content-grid">
        <article className="panel"><h3>Historiales</h3><DataTable rows={histories.rows} columns={[{ key: 'motivoConsulta', label: 'Motivo' }, { key: 'diagnostico', label: 'Diagnostico' }, { key: 'tratamiento', label: 'Tratamiento' }, { key: 'acciones', label: 'Acciones', render: (row) => <div className="table-actions"><button className="secondary-button compact-button" type="button" onClick={() => { setEditingHistoryId(row.id); setHistoryForm({ mascotaId: String(row.mascotaId), clienteId: String(row.clienteId), citaId: row.citaId ? String(row.citaId) : '', motivoConsulta: row.motivoConsulta || '', sintomas: row.sintomas || '', diagnostico: row.diagnostico || '', tratamiento: row.tratamiento || '', medicamentos: row.medicamentos || '', observaciones: row.observaciones || '', proximaCita: row.proximaCita || '' }); }}>Editar</button><button className="danger-button compact-button" type="button" onClick={() => removeClinical('clinical-records', row, histories.load)}>Desactivar</button></div> }]} /></article>
        <article className="panel"><h3>Tratamientos</h3><DataTable rows={treatments.rows} columns={[{ key: 'medicamentoServicio', label: 'Servicio' }, { key: 'estado', label: 'Estado', render: (row) => <StatusBadge value={row.estado} /> }, { key: 'seguimiento', label: 'Seguimiento' }, { key: 'acciones', label: 'Acciones', render: (row) => <div className="table-actions"><SelectInput className="table-select" value={row.estado} onChange={(event) => changeTreatmentStatus(row, event.target.value)} aria-label={`Cambiar estado de tratamiento ${row.id}`}>{treatmentStatuses.map((status) => <option key={status}>{status}</option>)}</SelectInput><button className="secondary-button compact-button" type="button" onClick={() => { setEditingTreatmentId(row.id); setTreatmentForm({ mascotaId: String(row.mascotaId), estado: row.estado, fechaInicio: row.fechaInicio || '', fechaFin: row.fechaFin || '', medicamentoServicio: row.medicamentoServicio || '', dosisIndicaciones: row.dosisIndicaciones || '', observaciones: row.observaciones || '', seguimiento: row.seguimiento || '' }); }}>Editar</button><button className="danger-button compact-button" type="button" onClick={() => removeClinical('treatments', row, treatments.load)}>Desactivar</button></div> }]} /></article>
        <article className="panel"><h3>Vacunas</h3><DataTable rows={vaccines.rows} columns={[{ key: 'nombreVacuna', label: 'Vacuna' }, { key: 'fechaAplicacion', label: 'Aplicacion' }, { key: 'proximaDosis', label: 'Proxima dosis' }, { key: 'acciones', label: 'Acciones', render: (row) => <div className="table-actions"><button className="secondary-button compact-button" type="button" onClick={() => { setEditingVaccineId(row.id); setVaccineForm({ mascotaId: String(row.mascotaId), nombreVacuna: row.nombreVacuna || '', fechaAplicacion: row.fechaAplicacion || '', proximaDosis: row.proximaDosis || '', lote: row.lote || '', fechaVencimientoProducto: row.fechaVencimientoProducto || '', observaciones: row.observaciones || '' }); }}>Editar</button><button className="danger-button compact-button" type="button" onClick={() => removeClinical('vaccines', row, vaccines.load)}>Desactivar</button></div> }]} /></article>
      </section>
    </div>
  );
}

export function InventoryPage() {
  const products = useResource('/products');
  const services = useResource('/services');
  const movements = useResource('/inventory/movements');
  const [productForm, setProductForm] = useState({ nombre: '', categoria: '', stock: 0, stockMinimo: 0, precio: 0, fechaVencimiento: '', lote: '' });
  const [serviceForm, setServiceForm] = useState({ nombre: '', categoria: '', precio: 0 });
  const [movementForm, setMovementForm] = useState({ productoId: '', tipo: 'Entrada', cantidad: 1, motivo: '' });
  const [editingProductId, setEditingProductId] = useState(null);
  const [editingServiceId, setEditingServiceId] = useState(null);

  const submitProduct = async (event) => {
    event.preventDefault();
    const payload = { ...productForm, stock: Number(productForm.stock), stockMinimo: Number(productForm.stockMinimo), precio: Number(productForm.precio), fechaVencimiento: productForm.fechaVencimiento || null };
    if (editingProductId) await api.put(`/products/${editingProductId}`, payload);
    else await api.post('/products', payload);
    setProductForm({ nombre: '', categoria: '', stock: 0, stockMinimo: 0, precio: 0, fechaVencimiento: '', lote: '' });
    setEditingProductId(null);
    products.load();
  };
  const submitService = async (event) => {
    event.preventDefault();
    const payload = { ...serviceForm, precio: Number(serviceForm.precio) };
    if (editingServiceId) await api.put(`/services/${editingServiceId}`, payload);
    else await api.post('/services', payload);
    setServiceForm({ nombre: '', categoria: '', precio: 0 });
    setEditingServiceId(null);
    services.load();
  };

  const submitMovement = async (event) => {
    event.preventDefault();
    await api.post('/inventory/movements', { ...movementForm, productoId: Number(movementForm.productoId), cantidad: Number(movementForm.cantidad) });
    setMovementForm({ productoId: '', tipo: 'Entrada', cantidad: 1, motivo: '' });
    await Promise.all([products.load(), movements.load()]);
  };

  const deactivate = async (kind, row) => {
    if (!window.confirm(`Desactivar ${row.nombre}?`)) return;
    await api.delete(`/${kind}/${row.id}`);
    await (kind === 'products' ? products.load() : services.load());
  };

  return (
    <div className="page-stack">
      <PageHeader icon={PackagePlus} title="Inventario y servicios" subtitle="Stock, vencimientos, servicios y alertas." />
      <section className="content-grid">
        <form className="panel form-panel" onSubmit={submitProduct}>
          <h3>Producto</h3>
          <Field label="Nombre"><TextInput value={productForm.nombre} onChange={(e) => setProductForm({ ...productForm, nombre: e.target.value })} required /></Field>
          <Field label="Categoria"><TextInput value={productForm.categoria} onChange={(e) => setProductForm({ ...productForm, categoria: e.target.value })} required /></Field>
          <Field label="Stock"><TextInput type="number" value={productForm.stock} onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })} required /></Field>
          <Field label="Stock minimo"><TextInput type="number" value={productForm.stockMinimo} onChange={(e) => setProductForm({ ...productForm, stockMinimo: e.target.value })} /></Field>
          <Field label="Precio"><TextInput type="number" step="0.01" value={productForm.precio} onChange={(e) => setProductForm({ ...productForm, precio: e.target.value })} required /></Field>
          <Field label="Vencimiento"><TextInput type="date" value={productForm.fechaVencimiento} onChange={(e) => setProductForm({ ...productForm, fechaVencimiento: e.target.value })} /></Field>
          <Field label="Lote"><TextInput value={productForm.lote} onChange={(e) => setProductForm({ ...productForm, lote: e.target.value })} /></Field>
          <SubmitButton icon={editingProductId ? Save : Plus}>{editingProductId ? 'Guardar producto' : 'Crear producto'}</SubmitButton>
          {editingProductId ? <button className="secondary-button" type="button" onClick={() => { setEditingProductId(null); setProductForm({ nombre: '', categoria: '', stock: 0, stockMinimo: 0, precio: 0, fechaVencimiento: '', lote: '' }); }}>Cancelar</button> : null}
        </form>

        <form className="panel form-panel" onSubmit={submitService}>
          <h3>Servicio</h3>
          <Field label="Nombre"><TextInput value={serviceForm.nombre} onChange={(e) => setServiceForm({ ...serviceForm, nombre: e.target.value })} required /></Field>
          <Field label="Categoria"><TextInput value={serviceForm.categoria} onChange={(e) => setServiceForm({ ...serviceForm, categoria: e.target.value })} required /></Field>
          <Field label="Precio"><TextInput type="number" step="0.01" value={serviceForm.precio} onChange={(e) => setServiceForm({ ...serviceForm, precio: e.target.value })} required /></Field>
          <SubmitButton icon={editingServiceId ? Save : Plus}>{editingServiceId ? 'Guardar servicio' : 'Crear servicio'}</SubmitButton>
          {editingServiceId ? <button className="secondary-button" type="button" onClick={() => { setEditingServiceId(null); setServiceForm({ nombre: '', categoria: '', precio: 0 }); }}>Cancelar</button> : null}
        </form>
        <form className="panel form-panel" onSubmit={submitMovement}>
          <h3>Movimiento de inventario</h3>
          <Field label="Producto"><SelectInput value={movementForm.productoId} onChange={(e) => setMovementForm({ ...movementForm, productoId: e.target.value })} required><option value="">Seleccione</option>{products.rows.map((item) => <option key={item.id} value={item.id}>{item.nombre} (stock {item.stock})</option>)}</SelectInput></Field>
          <Field label="Tipo"><SelectInput value={movementForm.tipo} onChange={(e) => setMovementForm({ ...movementForm, tipo: e.target.value })}><option>Entrada</option><option>Salida</option><option>Ajuste</option></SelectInput></Field>
          <Field label="Cantidad"><TextInput type="number" min="0.01" step="0.01" value={movementForm.cantidad} onChange={(e) => setMovementForm({ ...movementForm, cantidad: e.target.value })} required /></Field>
          <Field label="Motivo"><TextInput value={movementForm.motivo} onChange={(e) => setMovementForm({ ...movementForm, motivo: e.target.value })} required /></Field>
          <SubmitButton icon={PackagePlus}>Registrar movimiento</SubmitButton>
        </form>
      </section>
      <section className="content-grid">
        <article className="panel span-2"><h3>Productos</h3><DataTable rows={products.rows} columns={[{ key: 'nombre', label: 'Producto' }, { key: 'categoria', label: 'Categoria' }, { key: 'stock', label: 'Stock' }, { key: 'precio', label: 'Precio', render: (row) => money(row.precio) }, { key: 'fechaVencimiento', label: 'Vence' }, { key: 'acciones', label: 'Acciones', render: (row) => <div className="table-actions"><button className="secondary-button compact-button" type="button" onClick={() => { setEditingProductId(row.id); setProductForm({ nombre: row.nombre, categoria: row.categoria, stock: row.stock, stockMinimo: row.stockMinimo, precio: row.precio, fechaVencimiento: row.fechaVencimiento || '', lote: row.lote || '' }); }}>Editar</button><button className="danger-button compact-button" type="button" onClick={() => deactivate('products', row)}>Desactivar</button></div> }]} /></article>
        <article className="panel"><h3>Servicios</h3><DataTable rows={services.rows} columns={[{ key: 'nombre', label: 'Servicio' }, { key: 'categoria', label: 'Categoria' }, { key: 'precio', label: 'Precio', render: (row) => money(row.precio) }, { key: 'acciones', label: 'Acciones', render: (row) => <div className="table-actions"><button className="secondary-button compact-button" type="button" onClick={() => { setEditingServiceId(row.id); setServiceForm({ nombre: row.nombre, categoria: row.categoria, precio: row.precio }); }}>Editar</button><button className="danger-button compact-button" type="button" onClick={() => deactivate('services', row)}>Desactivar</button></div> }]} /></article>
        <article className="panel span-2"><h3>Movimientos recientes</h3><DataTable rows={movements.rows} columns={[{ key: 'productoId', label: 'Producto #' }, { key: 'tipo', label: 'Tipo' }, { key: 'cantidad', label: 'Cantidad' }, { key: 'motivo', label: 'Motivo' }, { key: 'creadoEn', label: 'Fecha' }]} /></article>
      </section>
    </div>
  );
}

export function SalesPage() {
  const [options, reloadOptions] = useOptions();
  const sales = useResource('/sales');
  const [ticket, setTicket] = useState(null);
  const [form, setForm] = useState({ clienteId: '', metodoPago: 'Efectivo', tipo: 'Servicio', referenciaId: '', cantidad: 1 });
  const items = form.tipo === 'Producto'
    ? options.products.filter((product) => Number(product.stock) > 0 && (!product.fechaVencimiento || product.fechaVencimiento >= clinicToday()))
    : options.services;

  const submit = async (event) => {
    event.preventDefault();
    const sale = await api.post('/sales', {
      clienteId: Number(form.clienteId),
      metodoPago: form.metodoPago,
      detalles: [{ tipo: form.tipo, referenciaId: Number(form.referenciaId), cantidad: Number(form.cantidad) }],
    });
    const printable = await api.get(`/sales/${sale.id}/ticket`);
    setTicket(printable);
    setForm({ clienteId: '', metodoPago: 'Efectivo', tipo: 'Servicio', referenciaId: '', cantidad: 1 });
    await Promise.all([sales.load(), reloadOptions()]);
  };

  return (
    <div className="page-stack">
      <PageHeader icon={ShoppingCart} title="Nueva Venta" subtitle="Productos, servicios, metodo de pago y ticket interno." />
      <section className="sales-reference-layout">
        <form className="panel form-panel sale-form-card" onSubmit={submit}>
          <div className="form-section-heading">
            <h3>Cliente</h3>
            <span>Seleccione el comprador de la venta</span>
          </div>
          <Field label="Cliente">
            <SelectInput value={form.clienteId} onChange={(e) => setForm({ ...form, clienteId: e.target.value })} required>
              <option value="">Seleccione</option>
              {options.clients.map((client) => <option key={client.id} value={client.id}>{client.nombre}</option>)}
            </SelectInput>
          </Field>

          <div className="form-section-heading">
            <h3>Agregar Producto/Servicio</h3>
            <span>Detalle para el ticket</span>
          </div>
          <div className="sale-item-grid">
            <Field label="Tipo">
              <SelectInput value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value, referenciaId: '' })}>
                <option>Servicio</option>
                <option>Producto</option>
              </SelectInput>
            </Field>
            <Field label="Producto o servicio">
              <SelectInput value={form.referenciaId} onChange={(e) => setForm({ ...form, referenciaId: e.target.value })} required>
                <option value="">Seleccione</option>
                {items.map((item) => <option key={item.id} value={item.id}>{item.nombre} - {money(item.precio)}</option>)}
              </SelectInput>
            </Field>
            <Field label="Cantidad">
              <TextInput type="number" min="1" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} required />
            </Field>
          </div>

          <div className="payment-strip">
            <span>Metodo de pago</span>
            <SelectInput value={form.metodoPago} onChange={(e) => setForm({ ...form, metodoPago: e.target.value })}>
              <option>Efectivo</option>
              <option>Debito</option>
              <option>Credito</option>
              <option>Transferencia</option>
            </SelectInput>
          </div>

          <SubmitButton icon={ShoppingCart}>Generar venta</SubmitButton>
        </form>
        <article className="panel ticket-panel">
          <div className="section-title">
            <h3>Ticket</h3>
            {ticket ? (
              <a className="icon-button" href={`/api/sales/${ticket.venta.id}/ticket.pdf`} target="_blank" rel="noopener noreferrer" title="Abrir ticket PDF de 80 mm para imprimir" aria-label="Abrir ticket para imprimir">
                <Printer size={18} />
              </a>
            ) : <button className="icon-button" type="button" disabled title="Genere una venta para imprimir"><Printer size={18} /></button>}
          </div>
          {ticket ? (
            <div className="ticket">
              <strong>{ticket.empresa.nombreClinica}</strong>
              <span>NIT: {ticket.empresa.nit}</span>
              <span>Ticket interno #{ticket.venta.id}</span>
              <span>Cliente: {ticket.cliente?.nombre}</span>
              <div className="ticket-lines">
                {ticket.venta.detalles.map((detail) => (
                  <span key={`${detail.tipo}-${detail.referenciaId}`}>
                    <b>{detail.cantidad}</b> {detail.descripcion} {money(detail.total)}
                  </span>
                ))}
              </div>
              <span>IVA: {money(ticket.venta.iva)}</span>
              <b>Total: {money(ticket.venta.total)}</b>
              <small>Vendedor: {ticket.vendedor?.nombre || 'Usuario no disponible'}</small>
              <small>Gracias por su compra</small>
            </div>
          ) : <p className="empty">Genere una venta para ver el comprobante.</p>}
        </article>
      </section>
      <article className="panel"><h3>Ventas registradas</h3><DataTable rows={sales.rows} columns={[{ key: 'id', label: '#' }, { key: 'metodoPago', label: 'Pago' }, { key: 'subtotal', label: 'Subtotal', render: (row) => money(row.subtotal) }, { key: 'iva', label: 'IVA', render: (row) => money(row.iva) }, { key: 'total', label: 'Total', render: (row) => money(row.total) }]} /></article>
    </div>
  );
}

export function ReportsPage() {
  const [reports, setReports] = useState(null);
  useEffect(() => { api.reports().then(setReports); }, []);
  if (!reports) return <div className="notice">Cargando reportes...</div>;
  return (
    <div className="page-stack">
      <PageHeader icon={FileText} title="Reportes" subtitle="Citas, inventario, tratamientos, servicios e inasistencias." />
      <div className="report-actions">
        <a className="primary-button" href="/api/reports/pdf" target="_blank" rel="noopener noreferrer">
          <Printer size={18} /> Generar reporte PDF
        </a>
      </div>
      <section className="dashboard-grid">
        <ReportBox title="Citas por estado" data={reports.citasPorEstado} />
        <ReportBox title="Servicios solicitados" data={reports.serviciosMasSolicitados} />
        <ReportBox title="Indicadores" data={{ Clientes: reports.clientesAtendidos, Mascotas: reports.mascotasAtendidas, Inasistencias: reports.inasistencias }} />
      </section>
      <section className="content-grid">
        <article className="panel"><h3>Stock bajo</h3><DataTable rows={reports.productosBajoStock} columns={[{ key: 'nombre', label: 'Producto' }, { key: 'stock', label: 'Stock' }, { key: 'stockMinimo', label: 'Minimo' }]} /></article>
        <article className="panel"><h3>Por vencer</h3><DataTable rows={reports.productosPorVencer} columns={[{ key: 'nombre', label: 'Producto' }, { key: 'lote', label: 'Lote' }, { key: 'fechaVencimiento', label: 'Vence' }]} /></article>
        <article className="panel"><h3>Productos vencidos</h3><DataTable rows={reports.productosVencidos || []} columns={[{ key: 'nombre', label: 'Producto' }, { key: 'lote', label: 'Lote' }, { key: 'fechaVencimiento', label: 'Vencio' }]} /></article>
      </section>
    </div>
  );
}

function ReportBox({ title, data }) {
  return (
    <article className="chart-panel">
      <h3>{title}</h3>
      {Object.entries(data || {}).map(([key, value]) => (
        <div className="report-line" key={key}><span>{key}</span><strong>{value}</strong></div>
      ))}
    </article>
  );
}

export function UsersPage() {
  const [options, reloadOptions] = useOptions();
  const users = useResource('/users');
  const [form, setForm] = useState({ nombre: '', usuario: '', email: '', password: '', roleId: '' });
  const [editingId, setEditingId] = useState(null);

  const submit = async (event) => {
    event.preventDefault();
    const payload = { ...form, roleId: Number(form.roleId) };
    if (!payload.password) delete payload.password;
    if (editingId) await api.put(`/users/${editingId}`, payload);
    else await api.post('/users', payload);
    setForm({ nombre: '', usuario: '', email: '', password: '', roleId: '' });
    setEditingId(null);
    await Promise.all([users.load(), reloadOptions()]);
  };

  const deactivate = async (row) => {
    if (!window.confirm(`Desactivar el usuario ${row.usuario}?`)) return;
    await api.delete(`/users/${row.id}`);
    await users.load();
  };

  return (
    <div className="page-stack">
      <PageHeader icon={ShieldCheck} title="Usuarios y roles" subtitle="Administracion de accesos por perfil." />
      <section className="content-grid">
        <form className="panel form-panel" onSubmit={submit}>
          <Field label="Nombre"><TextInput value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required /></Field>
          <Field label="Usuario"><TextInput value={form.usuario} onChange={(e) => setForm({ ...form, usuario: e.target.value })} required /></Field>
          <Field label="Email"><TextInput type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></Field>
          <Field label={editingId ? 'Nueva contrasena (opcional)' : 'Contrasena'}><TextInput type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editingId} /></Field>
          <Field label="Rol"><SelectInput value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })} required><option value="">Seleccione</option>{options.roles.map((role) => <option key={role.id} value={role.id}>{role.nombre}</option>)}</SelectInput></Field>
          <SubmitButton icon={editingId ? Save : UserPlus}>{editingId ? 'Guardar usuario' : 'Crear usuario'}</SubmitButton>
          {editingId ? <button className="secondary-button" type="button" onClick={() => { setEditingId(null); setForm({ nombre: '', usuario: '', email: '', password: '', roleId: '' }); }}>Cancelar</button> : null}
        </form>
        <article className="panel span-2"><h3>Usuarios activos</h3><DataTable rows={users.rows} columns={[{ key: 'nombre', label: 'Nombre' }, { key: 'usuario', label: 'Usuario' }, { key: 'email', label: 'Email' }, { key: 'rol', label: 'Rol' }, { key: 'acciones', label: 'Acciones', render: (row) => <div className="table-actions"><button className="secondary-button compact-button" type="button" onClick={() => { setEditingId(row.id); setForm({ nombre: row.nombre, usuario: row.usuario, email: row.email, password: '', roleId: String(row.roleId) }); }}>Editar</button><button className="danger-button compact-button" type="button" onClick={() => deactivate(row)}>Desactivar</button></div> }]} /></article>
      </section>
    </div>
  );
}

export function SettingsPage() {
  const [options, reloadOptions] = useOptions();
  const [form, setForm] = useState(null);
  const [riskForm, setRiskForm] = useState([]);
  const [riskSaving, setRiskSaving] = useState(false);
  const [riskFeedback, setRiskFeedback] = useState({ type: '', text: '' });
  const [audit, setAudit] = useState([]);
  const [speciesName, setSpeciesName] = useState('');
  const [breedForm, setBreedForm] = useState({ especieId: '', nombre: '' });
  const [editingSpeciesId, setEditingSpeciesId] = useState(null);
  const [editingBreedId, setEditingBreedId] = useState(null);

  useEffect(() => {
    if (options.config && !form) setForm(options.config);
  }, [options.config, form]);

  useEffect(() => {
    if (options.riskLevels.length && !riskForm.length) {
      setRiskForm(options.riskLevels.map(formatRiskLevelForForm));
    }
  }, [options.riskLevels, riskForm.length]);

  useEffect(() => {
    api.audit().then(setAudit).catch(() => setAudit([]));
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    const updated = await api.put('/config/company', {
      nombreClinica: form.nombreClinica,
      direccion: form.direccion,
      telefono: form.telefono,
      telefonoPetShop: form.telefonoPetShop,
      correoContacto: form.correoContacto,
      facebookUrl: form.facebookUrl || '',
      nit: form.nit,
      logoUrl: form.logoUrl || '',
      horario: form.horario,
      recordatoriosActivos: form.recordatoriosActivos,
    });
    setForm(updated);
    reloadOptions();
  };

  const updateRiskForm = (id, field, value) => {
    setRiskForm((current) =>
      current.map((risk) => (risk.id === id ? { ...risk, [field]: value } : risk)),
    );
  };

  const submitRiskRules = async () => {
    setRiskSaving(true);
    setRiskFeedback({ type: '', text: '' });
    try {
      const payload = riskForm.map(({ keywordsText, ...risk }) => ({
        id: Number(risk.id),
        nombre: risk.nombre,
        prioridad: Number(risk.prioridad),
        descripcion: risk.descripcion || '',
        tiempoAtencion: risk.tiempoAtencion,
        keywords: keywordsText.split(/[\n,;]+/).map((keyword) => keyword.trim()).filter(Boolean),
        color: risk.color,
        activo: risk.activo !== false,
      }));
      const updated = await api.put('/triage/rules', { riskLevels: payload });
      setRiskForm(updated.map(formatRiskLevelForForm));
      setRiskFeedback({ type: 'success', text: 'Reglas de triaje actualizadas correctamente.' });
      await reloadOptions();
    } catch (requestError) {
      setRiskFeedback({ type: 'danger', text: getApiError(requestError) });
    } finally {
      setRiskSaving(false);
    }
  };

  const submitSpecies = async (event) => {
    event.preventDefault();
    if (editingSpeciesId) await api.put(`/species/${editingSpeciesId}`, { nombre: speciesName });
    else await api.post('/species', { nombre: speciesName });
    setSpeciesName('');
    setEditingSpeciesId(null);
    await reloadOptions();
  };

  const submitBreed = async (event) => {
    event.preventDefault();
    const payload = { especieId: Number(breedForm.especieId), nombre: breedForm.nombre };
    if (editingBreedId) await api.put(`/breeds/${editingBreedId}`, payload);
    else await api.post('/breeds', payload);
    setBreedForm({ especieId: '', nombre: '' });
    setEditingBreedId(null);
    await reloadOptions();
  };

  const deactivateCatalog = async (resource, item) => {
    if (!window.confirm(`Desactivar ${item.nombre}?`)) return;
    await api.delete(`/${resource}/${item.id}`);
    await reloadOptions();
  };

  if (!form) return <div className="notice">Cargando configuracion...</div>;

  return (
    <div className="page-stack">
      <PageHeader icon={ShieldCheck} title="Empresa y auditoria" subtitle="Datos de ticket, horario y bitacora de acciones." />
      <section className="content-grid">
        <form className="panel form-panel" onSubmit={submit}>
          <Field label="Nombre clinica"><TextInput value={form.nombreClinica} onChange={(e) => setForm({ ...form, nombreClinica: e.target.value })} required /></Field>
          <Field label="Direccion"><TextInput value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} required /></Field>
          <Field label="Telefono / WhatsApp"><TextInput value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} required /></Field>
          <Field label="Telefono pet shop"><TextInput value={form.telefonoPetShop} onChange={(e) => setForm({ ...form, telefonoPetShop: e.target.value })} required /></Field>
          <Field label="Correo de contacto"><TextInput type="email" value={form.correoContacto} onChange={(e) => setForm({ ...form, correoContacto: e.target.value })} required /></Field>
          <Field label="Enlace de Facebook"><TextInput type="url" value={form.facebookUrl} onChange={(e) => setForm({ ...form, facebookUrl: e.target.value })} /></Field>
          <Field label="NIT"><TextInput value={form.nit} onChange={(e) => setForm({ ...form, nit: e.target.value })} required /></Field>
          <Field label="Horario"><TextInput value={form.horario} onChange={(e) => setForm({ ...form, horario: e.target.value })} required /></Field>
          <SubmitButton>Guardar empresa</SubmitButton>
        </form>
        <article className="panel">
          <h3>Especies</h3>
          <form className="form-panel" onSubmit={submitSpecies}>
            <Field label="Nueva especie"><TextInput value={speciesName} onChange={(event) => setSpeciesName(event.target.value)} required /></Field>
            <SubmitButton icon={editingSpeciesId ? Save : Plus}>{editingSpeciesId ? 'Guardar especie' : 'Agregar especie'}</SubmitButton>
            {editingSpeciesId ? <button className="secondary-button" type="button" onClick={() => { setEditingSpeciesId(null); setSpeciesName(''); }}>Cancelar</button> : null}
          </form>
          <DataTable rows={options.species} columns={[{ key: 'nombre', label: 'Nombre' }, { key: 'acciones', label: 'Accion', render: (row) => <div className="table-actions"><button className="secondary-button compact-button" type="button" onClick={() => { setEditingSpeciesId(row.id); setSpeciesName(row.nombre); }}>Editar</button><button className="danger-button compact-button" type="button" onClick={() => deactivateCatalog('species', row)}>Desactivar</button></div> }]} />
        </article>
        <article className="panel">
          <h3>Razas</h3>
          <form className="form-panel" onSubmit={submitBreed}>
            <Field label="Especie"><SelectInput value={breedForm.especieId} onChange={(event) => setBreedForm({ ...breedForm, especieId: event.target.value })} required><option value="">Seleccione</option>{options.species.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</SelectInput></Field>
            <Field label="Nueva raza"><TextInput value={breedForm.nombre} onChange={(event) => setBreedForm({ ...breedForm, nombre: event.target.value })} required /></Field>
            <SubmitButton icon={editingBreedId ? Save : Plus}>{editingBreedId ? 'Guardar raza' : 'Agregar raza'}</SubmitButton>
            {editingBreedId ? <button className="secondary-button" type="button" onClick={() => { setEditingBreedId(null); setBreedForm({ especieId: '', nombre: '' }); }}>Cancelar</button> : null}
          </form>
          <DataTable rows={options.breeds} columns={[{ key: 'nombre', label: 'Nombre' }, { key: 'acciones', label: 'Accion', render: (row) => <div className="table-actions"><button className="secondary-button compact-button" type="button" onClick={() => { setEditingBreedId(row.id); setBreedForm({ especieId: String(row.especieId), nombre: row.nombre }); }}>Editar</button><button className="danger-button compact-button" type="button" onClick={() => deactivateCatalog('breeds', row)}>Desactivar</button></div> }]} />
        </article>
        <article className="panel span-2">
          <div className="section-title">
            <h3>Clasificacion de riesgo</h3>
            <span>Palabras clave y tiempo sugerido por nivel</span>
          </div>
          <div className="triage-config-grid">
            {riskForm.map((risk) => (
              <div className="risk-config-card" key={risk.id}>
                <div className="risk-config-head">
                  <RiskBadge risk={risk} />
                  <TextInput
                    type="color"
                    value={risk.color || '#2563eb'}
                    onChange={(event) => updateRiskForm(risk.id, 'color', event.target.value)}
                    aria-label={`Color de ${risk.nombre}`}
                  />
                </div>
                <Field label="Nombre">
                  <TextInput value={risk.nombre} onChange={(event) => updateRiskForm(risk.id, 'nombre', event.target.value)} required />
                </Field>
                <Field label="Prioridad">
                  <TextInput type="number" min="1" value={risk.prioridad} onChange={(event) => updateRiskForm(risk.id, 'prioridad', event.target.value)} required />
                </Field>
                <Field label="Tiempo sugerido">
                  <TextInput value={risk.tiempoAtencion || ''} onChange={(event) => updateRiskForm(risk.id, 'tiempoAtencion', event.target.value)} required />
                </Field>
                <Field label="Descripcion">
                  <TextInput value={risk.descripcion || ''} onChange={(event) => updateRiskForm(risk.id, 'descripcion', event.target.value)} />
                </Field>
                <Field label="Palabras clave">
                  <TextArea value={risk.keywordsText} onChange={(event) => updateRiskForm(risk.id, 'keywordsText', event.target.value)} required />
                </Field>
              </div>
            ))}
          </div>
          <div className="button-row triage-actions">
            <button className="primary-button" type="button" onClick={submitRiskRules} disabled={riskSaving}>
              <Save size={18} />
              {riskSaving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
          {riskFeedback.text ? <div className={`notice ${riskFeedback.type}`}>{riskFeedback.text}</div> : null}
        </article>
        <article className="panel span-2">
          <div className="section-title">
            <h3>Auditoria reciente</h3>
            <a className="primary-button" href="/api/audit/pdf" target="_blank" rel="noopener noreferrer">
              <FileText size={18} /> Generar auditoria PDF
            </a>
          </div>
          <DataTable rows={audit.slice(0, 12)} columns={[
            { key: 'usuario', label: 'Realizado por', render: (row) => row.usuario ? `${row.usuario}${row.rol ? ` (${row.rol})` : ''}` : 'No identificado' },
            { key: 'accion', label: 'Accion' },
            { key: 'detalle', label: 'Detalle' },
            { key: 'creadoEn', label: 'Fecha y hora (Guatemala)', render: (row) => clinicDateTime(row.creadoEn) },
          ]} />
        </article>
      </section>
    </div>
  );
}
