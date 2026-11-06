import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { escapeHtml } from './validators';
import { formatDate } from './dates';

/** Genera el HTML de la receta. Todo el texto se escapa para evitar inyección de HTML. */
function prescriptionHtml(rx) {
  const e = escapeHtml;
  const meds = (rx.medications || [])
    .map(
      (m, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${e(m.name)}</strong></td>
        <td>${e(m.dose)}</td>
        <td>${e(m.frequency)}</td>
        <td>${e(m.duration)}</td>
      </tr>`
    )
    .join('');

  return `<!doctype html>
<html><head><meta charset="utf-8" />
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #1A2B3C; padding: 28px; font-size: 12px; }
  .head { display: flex; justify-content: space-between; border-bottom: 3px solid #1565C0; padding-bottom: 12px; }
  .brand { color: #1565C0; font-size: 22px; font-weight: bold; }
  .muted { color: #5F6F84; }
  h2 { font-size: 14px; color: #1565C0; margin: 20px 0 6px; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  th, td { border: 1px solid #D9E2EC; padding: 6px 8px; text-align: left; }
  th { background: #E3EEFB; }
  .box { background: #F4F7FB; border-radius: 6px; padding: 10px; }
  .foot { margin-top: 48px; display: flex; justify-content: space-between; align-items: flex-end; }
  .sign { border-top: 1px solid #1A2B3C; width: 220px; text-align: center; padding-top: 4px; }
  .code { font-family: monospace; font-size: 16px; letter-spacing: 2px; color: #1565C0; }
</style></head>
<body>
  <div class="head">
    <div>
      <div class="brand">TeleSalud</div>
      <div class="muted">Receta médica electrónica</div>
    </div>
    <div style="text-align:right">
      <div><strong>Fecha:</strong> ${e(formatDate(rx.createdAt))}</div>
      <div><strong>Válida hasta:</strong> ${e(formatDate(rx.validUntil))}</div>
      <div><strong>N.º:</strong> ${e(rx.id.slice(0, 10).toUpperCase())}</div>
    </div>
  </div>

  <h2>Médico</h2>
  <div>${e(rx.doctorName)} — ${e(rx.specialty || '')}<br/><span class="muted">JVPM ${e(rx.doctorLicense || '')}</span></div>

  <h2>Paciente</h2>
  <div>${e(rx.patientName)}</div>

  <h2>Diagnóstico</h2>
  <div class="box">${e(rx.diagnosis)}</div>

  <h2>Medicamentos</h2>
  <table>
    <tr><th>#</th><th>Medicamento</th><th>Dosis</th><th>Frecuencia</th><th>Duración</th></tr>
    ${meds}
  </table>

  ${rx.instructions ? `<h2>Indicaciones</h2><div class="box">${e(rx.instructions)}</div>` : ''}

  <div class="foot">
    <div>
      <div class="muted">Código de verificación</div>
      <div class="code">${e(rx.code)}</div>
    </div>
    <div class="sign">${e(rx.doctorName)}<br/><span class="muted">Firma electrónica</span></div>
  </div>
</body></html>`;
}

export async function prescriptionToPdf(rx) {
  const { uri } = await Print.printToFileAsync({ html: prescriptionHtml(rx) });
  return uri;
}

export async function sharePrescription(rx) {
  const uri = await prescriptionToPdf(rx);
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Compartir no está disponible en este dispositivo.');
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Compartir receta',
    UTI: 'com.adobe.pdf',
  });
}
