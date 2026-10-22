import type { CategoryIconName } from '@/features/categories/types';
import type { CategoryColorToken } from '@/theme/categoryColors';

export type UpcomingFeature = {
  name: string;
  icon: CategoryIconName | 'microphone';
  color: CategoryColorToken;
  description: string;
  details: string;
};

export const upcomingFeatures: readonly UpcomingFeature[] = [
  {
    name: 'Chat de voz con IA',
    icon: 'microphone',
    color: 'plum',
    description:
      'Imaginamos que puedas usar la voz para preparar un movimiento o consultar tus gastos con palabras cotidianas.',
    details:
      'Por ejemplo: «Gasté 20 euros en el supermercado». La propuesta es mostrarte lo que la IA entendió y pedirte confirmación antes de guardar cambios, usando solo el espacio que elijas.',
  },
  {
    name: 'Ahorros',
    icon: 'piggy-bank',
    color: 'forest',
    description:
      'Queremos que puedas separar dinero para lo que te importa, definir cuánto te gustaría reunir y ver tu progreso.',
    details:
      'La idea es registrar aportaciones a tu ritmo, a solas o en un espacio compartido, y distinguir tus ahorros del dinero para el día a día.',
  },
  {
    name: 'Lista de deseos',
    icon: 'heart',
    color: 'pink',
    description:
      'Imaginamos un lugar para guardar esas cosas que te gustaría comprar, con su precio orientativo, un enlace y su prioridad.',
    details:
      'Así podrás comparar opciones y decidir qué deseo encaja mejor con tu presupuesto, también junto a otra persona.',
  },
  {
    name: 'Espacios familiares',
    icon: 'users-three',
    color: 'blue',
    description:
      'Queremos ampliar los espacios compartidos para incluir a más miembros de la familia.',
    details:
      'La idea es organizar los gastos del hogar, reconocer quién aporta cada movimiento y elegir qué se comparte, manteniendo las finanzas personales separadas.',
  },
  {
    name: 'Planes',
    icon: 'compass',
    color: 'orange',
    description:
      'Pensamos en reunir el presupuesto y los gastos de un viaje, una celebración o cualquier proyecto en un mismo lugar.',
    details:
      'Podrías preparar una estimación, sumar aportaciones y seguir lo gastado para saber cuánto queda disponible para ese plan.',
  },
  {
    name: 'Préstamos',
    icon: 'hand-coins',
    color: 'teal',
    description:
      'La idea es ayudarte a llevar el registro del dinero que prestas o te prestan: a quién, cuánto y qué queda por devolver.',
    details:
      'Queremos incluir devoluciones parciales y recordatorios opcionales. Sería una herramienta de seguimiento, no un servicio para conceder préstamos.',
  },
  {
    name: 'Escáner de facturas',
    icon: 'invoice',
    color: 'violet',
    description:
      'Queremos que puedas fotografiar una factura o un recibo y obtener una propuesta de gasto con el importe, la fecha y el comercio.',
    details:
      'Antes de guardarlo, podrías revisar y corregir los datos, elegir la categoría y confirmar la cuenta y el espacio.',
  },
];
