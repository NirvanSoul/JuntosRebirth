import type { LegalDocumentContent } from '@/features/legal/model/types';

/**
 * Fuente de contenido único: `scripts/generate-legal-site.ts` genera
 * `Legal/site/terms.html` a partir de este mismo módulo. Editar solo aquí.
 */
export const termsOfService: LegalDocumentContent = {
  documentId: 'terms-of-service',
  version: '2026.1',
  effectiveDate: 'Fecha de publicación de la app en las tiendas',
  lastUpdated: '2026-08-07',
  locale: 'es-ES',
  title: 'Términos de servicio de Juntos',
  intro: [
    'Estos términos regulan el uso de Juntos. Al usar la aplicación aceptas estas condiciones.',
  ],
  sections: [
    {
      heading: '1. Proveedor',
      body: [
        'Juntos es operada por Alan Rios y Alejandro Perez, con residencia en Venezuela y España respectivamente, con contacto en aora.estudio.o@gmail.com.',
      ],
    },
    {
      heading: '2. Elegibilidad',
      body: [
        'Juntos no está dirigida a niños. Debes tener al menos 14 años para usarla, conforme a los lineamientos de audiencia objetivo de Google Play (https://support.google.com/googleplay/android-developer/answer/9867159).',
      ],
    },
    {
      heading: '3. Cuenta',
      body: [
        'Puedes usar Juntos como invitado, con tus datos guardados solo en tu dispositivo, o crear una cuenta para sincronizar y compartir información entre dispositivos y con otra persona.',
        'Eres responsable de la información que proporcionas al crear tu cuenta y de mantenerla actualizada.',
      ],
    },
    {
      heading: '4. Credenciales',
      body: [
        'Eres responsable de mantener la confidencialidad de tus credenciales de acceso y de cualquier actividad realizada desde tu cuenta. Avísanos si sospechas un uso no autorizado.',
      ],
    },
    {
      heading: '5. Licencia de uso',
      body: [
        'Te concedemos una licencia limitada, personal, no exclusiva e intransferible para usar Juntos de acuerdo con estos términos.',
      ],
    },
    {
      heading: '6. Uso permitido',
      body: [
        'Puedes usar Juntos para registrar y organizar tus finanzas personales y, si lo decides, compartirlas de forma selectiva con otra persona dentro de un espacio compartido.',
      ],
    },
    {
      heading: '7. Uso prohibido',
      body: [
        'No está permitido: usar Juntos con fines ilícitos, intentar acceder a datos de otras personas sin autorización, realizar ingeniería inversa de la aplicación, sobrecargar nuestros sistemas deliberadamente, ni introducir contenido difamatorio, fraudulento o que infrinja derechos de terceros.',
      ],
    },
    {
      heading: '8. Contenido del usuario',
      body: [
        'Los movimientos, categorías y demás información que registras son tuyos. Nos concedes el derecho estrictamente necesario para almacenarlos, sincronizarlos y mostrártelos a ti y a los demás miembros de tus espacios compartidos.',
      ],
    },
    {
      heading: '9. Espacios compartidos',
      body: [
        'Un espacio compartido (por ejemplo, de pareja) muestra a sus miembros los movimientos registrados dentro de ese espacio, junto con su autoría. Antes de compartir un espacio, entiende qué información verá la otra persona.',
        'Salir de un espacio compartido o eliminar tu cuenta no borra automáticamente los movimientos legítimos de otros miembros; ver la Política de privacidad, sección 13.',
      ],
    },
    {
      heading: '10. Recordatorios y notificaciones',
      body: [
        'Los recordatorios de gastos e ingresos son notificaciones locales que tú activas y configuras. Puedes desactivarlas u ocultar los importes que muestran desde Preferencias de privacidad.',
      ],
    },
    {
      heading: '11. Disponibilidad del servicio',
      body: [
        'Procuramos que Juntos esté disponible de forma continua, pero no garantizamos un funcionamiento ininterrumpido o libre de errores. Podemos suspender temporalmente el servicio por mantenimiento.',
      ],
    },
    {
      heading: '12. Publicidad',
      body: [
        'Actualmente Juntos no muestra anuncios. Si en el futuro se incorpora publicidad, se actualizarán estos términos y la Política de privacidad antes de activarla.',
      ],
    },
    {
      heading: '13. Pagos futuros',
      body: [
        'Juntos no procesa pagos ni gestiona fondos reales actualmente. Si en el futuro se ofrecen funciones de pago (por ejemplo, para quitar anuncios), se explicarán con claridad antes de cobrarte nada.',
      ],
    },
    {
      heading: '14. Propiedad intelectual',
      body: [
        'La marca, el diseño y el código de Juntos son propiedad de su proveedor o de sus licenciantes. Estos términos no te ceden ningún derecho sobre ellos más allá de la licencia de uso descrita.',
      ],
    },
    {
      heading: '15. Terceros',
      body: [
        'Usamos la API de Juntos como infraestructura de autenticación y sincronización de datos. El uso de Juntos puede estar sujeto también a los términos de la tienda de aplicaciones (Apple App Store o Google Play) desde la que la instalaste.',
      ],
    },
    {
      heading: '16. No es asesoramiento financiero',
      body: [
        'Juntos organiza la información que tú introduces; no ofrece asesoramiento financiero, fiscal ni legal, no garantiza resultados sobre tus finanzas, no es una entidad bancaria y, salvo que se indique lo contrario en el futuro, no custodia fondos ni ejecuta pagos en tu nombre.',
      ],
    },
    {
      heading: '17. Terminación',
      body: [
        'Puedes dejar de usar Juntos en cualquier momento. Podemos suspender o cerrar tu cuenta si incumples gravemente estos términos, tras avisarte cuando sea razonablemente posible.',
      ],
    },
    {
      heading: '18. Eliminación',
      body: [
        'Puedes solicitar la eliminación de tu cuenta y tus datos en cualquier momento desde Ajustes → Ayuda → Política de privacidad → Tus datos → Eliminar cuenta y datos, según se describe en la Política de privacidad.',
      ],
    },
    {
      heading: '19. Cambios en estos términos',
      body: [
        'Podemos actualizar estos términos. Si el cambio es material, te lo notificaremos dentro de la aplicación antes de que entre en vigor.',
      ],
    },
    {
      heading: '20. Ley aplicable',
      body: [
        'Estos términos se rigen por la legislación española, sin perjuicio de los derechos que la normativa de protección de personas consumidoras de tu país de residencia te reconozca con carácter imperativo.',
      ],
    },
    {
      heading: '21. Contacto',
      body: [
        'Para cualquier consulta sobre estos términos, escríbenos a aora.estudio.o@gmail.com.',
      ],
    },
  ],
};
