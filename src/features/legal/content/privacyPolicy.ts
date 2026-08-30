import type { LegalDocumentContent } from '@/features/legal/model/types';

/**
 * Fuente de contenido único: `scripts/generate-legal-site.ts` genera
 * `Legal/site/privacy.html` a partir de este mismo módulo. Editar solo aquí.
 */
export const privacyPolicy: LegalDocumentContent = {
  documentId: 'privacy-policy',
  version: '2026.1',
  effectiveDate: 'Fecha de publicación de la app en las tiendas',
  lastUpdated: '2026-08-07',
  locale: 'es-ES',
  title: 'Política de privacidad de Juntos',
  intro: [
    'Juntos es una aplicación de finanzas personales. Esta política explica qué datos tratamos, de dónde vienen, para qué los usamos y qué derechos tienes sobre ellos.',
    'Esta política se actualizará cada vez que cambien los datos que tratamos, los proveedores que usamos o las finalidades del tratamiento.',
  ],
  sections: [
    {
      heading: '1. Identidad del responsable',
      body: [
        'Juntos es desarrollada y operada por Alan Rios y Alejandro Perez, con residencia en Venezuela y España respectivamente.',
      ],
    },
    {
      heading: '2. Datos de contacto',
      body: [
        'Para cualquier consulta sobre privacidad puedes escribir a aora.estudio.o@gmail.com.',
      ],
    },
    {
      heading: '3. Qué datos se recogen',
      body: [
        'Datos de cuenta (cuando creas una cuenta): nombre, correo electrónico, identificador de usuario y metadatos técnicos de autenticación gestionados por la API de Juntos.',
        'Datos financieros que introduces tú mismo: importe, tipo (gasto o ingreso), categoría, título o descripción breve, fecha, recurrencia y el espacio (personal o compartido) al que pertenece cada movimiento.',
        'Datos de espacios compartidos: qué miembros pertenecen a un espacio y quién es autor de cada movimiento dentro de él.',
        'Preferencias de la aplicación: moneda, apariencia, reglas de recordatorio y si quieres ver importes en las notificaciones.',
        'Identificador local de instalación, usado únicamente para vincular tus datos de invitado a tu cuenta cuando te registras.',
        'No recogemos ubicación, contactos, cámara ni fotos: la aplicación no solicita esos permisos porque no los necesita.',
      ],
    },
    {
      heading: '4. De dónde provienen',
      body: [
        'Todos los datos anteriores los introduces directamente tú al usar la aplicación. Juntos no compra ni obtiene datos de terceros sobre ti.',
      ],
    },
    {
      heading: '5. Para qué se usan',
      body: [
        'Para ofrecerte las funciones que usas: registrar movimientos, calcular tu balance, mostrar categorías, gestionar espacios compartidos y enviarte recordatorios locales que tú mismo activas.',
        'Para mantener tu cuenta y sincronizar tus datos entre dispositivos, cuando decides registrarte.',
        'No usamos tus datos financieros para publicidad ni analítica. Actualmente Juntos no muestra anuncios ni usa herramientas de analítica o seguimiento (ver sección 14).',
      ],
    },
    {
      heading: '6. Base jurídica',
      body: [
        'Tratamos los datos necesarios para prestarte el servicio sobre la base de la ejecución de un contrato contigo (los términos de servicio) y, cuando corresponda, tu consentimiento explícito para funciones opcionales.',
        'Cuando el Reglamento General de Protección de Datos de la Unión Europea (RGPD) resulta aplicable, seguimos los principios que describe la Comisión Europea en https://commission.europa.eu/law/law-topic/data-protection_en.',
      ],
    },
    {
      heading: '7. Terceros y encargados',
      body: [
        'La API de Juntos procesa la autenticación y los datos de cuenta cuando te registras. Antes del lanzamiento definitivo confirmaremos en esta política los encargados de infraestructura y la región aplicable.',
        'No usamos actualmente proveedores de analítica, publicidad ni informes de fallos. Si en el futuro integramos Google AdMob para mostrar anuncios, esta política se actualizará antes de activarlos y seguiremos las políticas de consentimiento de anuncios de Google (https://support.google.com/admob/answer/13554116), incluyendo una plataforma de consentimiento certificada en el Espacio Económico Europeo, Reino Unido y Suiza (https://support.google.com/admob/answer/16918505).',
      ],
    },
    {
      heading: '8. Transferencias internacionales',
      body: [
        'Si nuestra infraestructura transfiere datos fuera de tu país, aplicamos las garantías que exige la normativa de protección de datos aplicable, como las cláusulas contractuales tipo aprobadas por la Comisión Europea cuando corresponda (https://commission.europa.eu/law/law-topic/data-protection_en).',
      ],
    },
    {
      heading: '9. Retención',
      body: [
        'Conservamos tus datos mientras mantengas tu cuenta o tus datos locales. Al eliminar tu cuenta, tus datos personales se borran o anonimizan de inmediato según se describe en la sección 13; las copias de seguridad técnicas se sobrescriben conforme al ciclo habitual de nuestro proveedor de infraestructura.',
      ],
    },
    {
      heading: '10. Seguridad',
      body: [
        'Las conexiones con nuestro backend usan HTTPS. Las credenciales de sesión se guardan cifradas en el almacenamiento seguro del sistema operativo (Keychain en iOS, Keystore en Android).',
        'La API valida la sesión y la pertenencia al espacio en cada operación remota, de forma que cada persona solo puede leer o modificar los datos de los espacios a los que pertenece.',
        'Ningún sistema es 100% seguro; si detectamos una incidencia que afecte a tus datos, te lo comunicaremos según exija la ley aplicable.',
      ],
    },
    {
      heading: '11. Tus derechos',
      body: [
        'Puedes solicitar el acceso, la corrección, la portabilidad y la eliminación de tus datos, así como oponerte u obtener la limitación de determinados tratamientos, desde Ajustes → Ayuda → Política de privacidad → Tus datos, o escribiendo a aora.estudio.o@gmail.com.',
      ],
    },
    {
      heading: '12. Retirada del consentimiento',
      body: [
        'Cuando un tratamiento se base en tu consentimiento (por ejemplo, notificaciones o, en el futuro, publicidad personalizada), puedes retirarlo en cualquier momento desde Preferencias de privacidad, sin que ello afecte a la licitud del tratamiento previo.',
      ],
    },
    {
      heading: '13. Eliminación de cuenta y datos',
      body: [
        'Puedes iniciar la eliminación de tu cuenta y tus datos desde dentro de la aplicación, en Ajustes → Ayuda → Política de privacidad → Tus datos → Eliminar cuenta y datos.',
        'Si usas Juntos como invitado (sin cuenta), tus datos existen solo en tu dispositivo y esa misma opción los borra localmente sin necesidad de conexión.',
        'Si tienes cuenta, al confirmar la eliminación: cerramos tu sesión, eliminamos o anonimizamos tus movimientos según si pertenecen a un espacio personal o compartido (para no romper los datos legítimos de la otra persona del espacio), y eliminamos tu cuenta de autenticación. Esto cumple con los requisitos de eliminación de cuenta de Apple (https://developer.apple.com/support/offering-account-deletion-in-your-app/) y Google Play (https://support.google.com/googleplay/android-developer/answer/13327111).',
      ],
    },
    {
      heading: '14. Publicidad y seguimiento',
      body: [
        'Hoy Juntos no muestra anuncios ni usa herramientas de seguimiento entre aplicaciones o sitios web.',
        'Si en el futuro integramos publicidad (previsiblemente Google AdMob), lo anunciaremos, actualizaremos esta política, y mostraremos un mensaje de consentimiento (CMP) certificado antes de solicitar anuncios personalizados donde la ley lo exija.',
      ],
    },
    {
      heading: '15. Menores y edad objetivo',
      body: [
        'Juntos no está dirigida a niños ni diseñada para audiencias infantiles: no muestra publicidad dirigida a menores ni contenido sensible, violento o inadecuado. Su uso está pensado para personas a partir de 14 años.',
        'Esta declaración sigue los lineamientos de audiencia objetivo de Google Play (https://support.google.com/googleplay/android-developer/answer/9867159).',
      ],
    },
    {
      heading: '16. Cambios de esta política',
      body: [
        'Si introducimos un cambio material (nueva finalidad, nuevo tipo de dato, nuevo tercero relevante, publicidad o seguimiento), te lo notificaremos dentro de la aplicación antes de que entre en vigor.',
        'Los cambios menores (por ejemplo correcciones de redacción) se reflejan actualizando la fecha de "Última actualización" sin notificación adicional.',
      ],
    },
    {
      heading: '17. Contacto y reclamaciones',
      body: [
        'Para cualquier consulta o reclamación sobre privacidad, escríbenos a aora.estudio.o@gmail.com. Si no estás satisfecho con nuestra respuesta, tienes derecho a presentar una reclamación ante la autoridad de protección de datos de tu país.',
      ],
    },
  ],
};
