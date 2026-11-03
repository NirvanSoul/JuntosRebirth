/**
 * Textos en español, idioma de referencia: define las claves que `en.ts` debe
 * cubrir. Se agrupan por pantalla o componente que las muestra.
 */
export const es = {
  language: {
    title: 'Idioma',
    subtitle: 'Elige el idioma en el que quieres usar Juntos.',
    settingsLabel: 'Idioma',
  },
  onboarding: {
    country: {
      title: '¿Desde dónde usarás Juntos?',
      subtitle:
        'Escribe el nombre de tu país y te mostraremos opciones similares.',
      noResults: 'No encontramos un país con ese nombre.',
      saveError: 'No pudimos guardar tu moneda. Inténtalo de nuevo.',
      languagePromptTitle: '¿En qué idioma quieres usar Juntos?',
      languagePromptSubtitle: 'Podrás cambiarlo más tarde en Ajustes.',
    },
  },
  navigation: {
    tabs: {
      home: 'Inicio',
      comingSoon: 'Pronto',
      activity: 'Actividad',
      map: 'Mapa',
    },
    saveError: {
      title: 'No pudimos guardar el cambio',
      message: 'Tus datos anteriores siguen intactos. Inténtalo de nuevo.',
    },
    spaceHeader: {
      spaceLabel: 'Espacio {{name}}',
      spaceHint: 'Abre el menú para cambiar o crear un espacio',
      currencyLabel: 'Moneda seleccionada: {{currency}}',
      currencyHint: 'Cambia la moneda seleccionada',
    },
    createButton: {
      label: 'Crear',
      hint: 'Abre las opciones para crear un ingreso, gasto o categoría',
    },
    previewActions: {
      transactionFallbackTitle: 'Movimiento',
      transactionsCount_one: '{{count}} movimiento',
      transactionsCount_other: '{{count}} movimientos',
      deleteTransaction: 'Eliminar movimiento',
      deleteTransactions: 'Eliminar movimientos',
      editTransaction: 'Editar movimiento',
      copyTransaction: 'Copiar movimiento a otro espacio',
      copyTransactions: 'Copiar movimientos a otro espacio',
      deleteAccount: 'Eliminar cuenta',
      editAccount: 'Editar cuenta',
      deleteCategory: 'Eliminar categoría',
      editCategory: 'Editar categoría',
      copyCategory: 'Copiar categoría a otro espacio',
    },
  },
  settings: {
    title: 'Ajustes',
    sections: {
      preferences: 'Preferencias',
      notifications: 'Notificaciones',
      dataPrivacy: 'Datos y privacidad',
      coupleSpace: 'Espacio de pareja',
      help: 'Ayuda',
      account: 'Cuenta',
    },
    rows: {
      currency: 'Moneda',
      country: 'País',
      countryNotSelected: 'Sin elegir',
      homeComparison: 'Comparación en Inicio',
      homeComparisonDescription: 'Compara con el mes anterior',
      currencySymbols: 'Símbolos de moneda',
      currencySymbolsOn: 'Visibles junto a los importes',
      currencySymbolsOff: 'Solo se muestran los números',
      reminders: 'Recordatorios y alertas',
      remindersOn: 'Activadas',
      remindersOff: 'Desactivadas',
      dataStatus: 'Estado de los datos',
      dataStatusValue: 'Guardados en este dispositivo',
      dataUsage: 'Cómo usamos tus datos',
      privacyChoices: 'Preferencias de privacidad',
      permissions: 'Permisos de la aplicación',
      leaveCoupleSpace: 'Salir del espacio de pareja',
      contactDeveloper: 'Contactar con el desarrollador',
      privacyPolicy: 'Política de privacidad',
      restartOnboarding: 'Reiniciar onboarding',
      signOut: 'Cerrar sesión',
    },
    previousCountryFallback: 'tu país anterior',
    remindersSaved: 'Recordatorios y alertas actualizados.',
    contactCopied: 'Correo copiado: {{email}}',
    saveSettingError: {
      title: 'No pudimos guardar el ajuste',
      message: 'Inténtalo de nuevo.',
    },
    signOut: {
      title: 'Cerrar sesión',
      message: '¿Quieres cerrar la sesión de esta cuenta?',
      confirm: 'Cerrar sesión',
      errorTitle: 'No pudimos cerrar sesión',
      errorMessage: 'Inténtalo de nuevo en unos momentos.',
      pendingTitle: 'Tienes cambios sin subir',
      pendingMessage_one:
        'Hay {{count}} cambio guardado solo en este dispositivo. Al cerrar sesión se borra de aquí, así que primero intentaremos subirlo.',
      pendingMessage_other:
        'Hay {{count}} cambios guardados solo en este dispositivo. Al cerrar sesión se borran de aquí, así que primero intentaremos subirlos.',
      uploadAndSignOut: 'Subir y cerrar sesión',
      uploadFailedTitle: 'No pudimos subir tus cambios',
      uploadFailedMessage_one:
        '{{count}} cambio sigue sin subir. Si cierras sesión ahora, se borrará de este dispositivo y no podrás recuperarlo. Puedes cancelar y volver a intentarlo con conexión.',
      uploadFailedMessage_other:
        '{{count}} cambios siguen sin subir. Si cierras sesión ahora, se borrarán de este dispositivo y no podrás recuperarlos. Puedes cancelar y volver a intentarlo con conexión.',
      unknownPendingMessage:
        'No pudimos comprobar si quedan cambios sin subir. Si cierras sesión ahora, cualquier cambio pendiente se borrará de este dispositivo y no podrás recuperarlo.',
      discardAndSignOut: 'Cerrar sesión y borrarlos',
      deviceOnlyNote:
        'Esto no se guarda en tu cuenta y también se borrará: {{items}}.',
      deviceOnlyImports_one: '{{count}} importación sin terminar',
      deviceOnlyImports_other: '{{count}} importaciones sin terminar',
      deviceOnlyRules_one: '{{count}} configuración de recordatorios',
      deviceOnlyRules_other: '{{count}} configuraciones de recordatorios',
      deviceOnlyJoin: ' y ',
    },
    restartOnboarding: {
      title: 'Reiniciar onboarding',
      message: 'Se cerrará la sesión y volverás al inicio del proceso.',
      confirm: 'Reiniciar',
    },
    leaveCoupleSpace: {
      warningTitle: 'Saldrás de este espacio',
      warningMessage:
        'Dejarás de tener acceso a sus movimientos y categorías. Si ambas personas salen, el espacio se eliminará automáticamente.',
      cancelLabel: 'Cancelar salida del espacio de pareja',
      waitLabel: 'Espera {{seconds}} segundos para confirmar la salida',
      wait: 'Espera ({{seconds}})',
      confirmLabel: 'Confirmar salida del espacio de pareja',
      confirm: 'Sí, salir',
      error: 'No pudimos salir del espacio de pareja. Inténtalo de nuevo.',
    },
    profile: {
      photoTitle: 'Foto de perfil',
      photoMessage:
        'Para elegir una imagen, Juntos necesita acceder a tus fotos o a la cámara. Se usará solo como tu foto de perfil.',
      takePhoto: 'Tomar foto',
      chooseFromLibrary: 'Elegir de la galería',
      removePhoto: 'Quitar foto',
      changePhotoLabel: 'Cambiar foto de perfil',
      tapToChangePhoto: 'Toca tu foto para cambiarla',
      editNameLabel: 'Editar nombre',
      addName: 'Agregar tu nombre',
    },
    displayName: {
      title: 'Editar nombre',
      subtitle: 'Solo lo verán las personas con las que compartas un espacio.',
      inputLabel: 'Tu nombre',
      placeholder: 'Escribe tu nombre',
      saveLabel: 'Guardar nombre',
    },
    currencyModal: {
      title: 'Moneda',
      hint: 'Selecciona máximo {{max}} monedas',
      maxReached: 'Ya elegiste {{max}} monedas. Quita una para añadir otra.',
      minRequired: 'Debes mantener al menos una moneda activa.',
      searchLabel: 'Buscar moneda',
      searchPlaceholder: 'Busca por país, moneda o código',
      noResults: 'No encontramos ninguna moneda con esa búsqueda.',
      saveLabel: 'Guardar monedas',
    },
    countryModal: {
      title: 'País',
      subtitle: 'Elige el país desde donde usas Juntos.',
      searchLabel: 'Buscar país',
      searchPlaceholder: 'Busca por nombre de país',
      noResults: 'No encontramos ningún país con esa búsqueda.',
      saveLabel: 'Guardar país',
    },
    countryBlocked: {
      title: 'No puedes cambiar tu país todavía',
      message:
        'Tu país debe coincidir con las personas de tus espacios compartidos. Sal del espacio compartido o coordina el cambio con la otra persona antes de intentarlo de nuevo.',
    },
    countryWarning: {
      title: 'Saldrás del espacio compartido',
      message:
        'Al cambiar tu país a {{country}}, dejarás tu espacio compartido actual. Tus finanzas personales no se borrarán y la otra persona conservará el espacio.',
      cancelLabel: 'Cancelar cambio de país',
      confirm: 'Cambiar país',
    },
  },
  common: {
    back: 'Volver',
    cancel: 'Cancelar',
    close: 'Cerrar',
    continue: 'Continuar',
    save: 'Guardar',
    saving: 'Guardando…',
    understood: 'Entendido',
  },
};

export type TranslationResources = typeof es;
