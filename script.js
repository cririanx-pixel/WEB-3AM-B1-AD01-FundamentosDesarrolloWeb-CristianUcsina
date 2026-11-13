const USUARIOS = [
    { usuario: "cliente1", password: "cliente123",  nombre: "Juan Pérez",    rol: "cliente",       telefono: "0991234567", email: "juan@mail.com",    habilitado: true  },
    { usuario: "cliente2", password: "cliente123",  nombre: "María López",   rol: "cliente",       telefono: "0987654321", email: "maria@mail.com",   habilitado: true  },
    { usuario: "admin",    password: "admin123",    nombre: "Administrador", rol: "administrador", telefono: "0999999999", email: "admin@taller.com", habilitado: true  },
    { usuario: "inactivo", password: "inactivo123", nombre: "No se que poner",  rol: "cliente",       telefono: "0911111111", email: "vieja@mail.com",   habilitado: false }
];


const ESTADOS = ["Pendiente", "En revisión", "En proceso", "Finalizado", "Cancelado"];

let solicitudes = [
    { id: 1, propietario: "cliente1", nombre: "Juan Pérez",  email: "juan@mail.com",  telefono: "0991234567", placa: "ABC-1234", marca: "Chevrolet", modelo: "Sail",    anio: 2020, kilometraje: 45000, servicio: "Cambio de aceite",    fecha: "2026-11-15", hora: "09:00", tipoAtencion: "En taller", adicionales: ["Lavado"],            descripcion: "Cambio de aceite y filtro",      estado: "Pendiente"  },
    { id: 2, propietario: "cliente1", nombre: "Juan Pérez",  email: "juan@mail.com",  telefono: "0991234567", placa: "XYZ-9876", marca: "Toyota",    modelo: "Corolla", anio: 2019, kilometraje: 62000, servicio: "Frenos",              fecha: "2026-11-18", hora: "10:30", tipoAtencion: "En taller", adicionales: [],                    descripcion: "Revisión de pastillas de freno", estado: "En proceso" },
    { id: 3, propietario: "cliente2", nombre: "María López", email: "maria@mail.com", telefono: "0987654321", placa: "DEF-5678", marca: "Hyundai",   modelo: "Accent",  anio: 2022, kilometraje: 18000, servicio: "Escaneo electrónico", fecha: "2026-11-20", hora: "08:30", tipoAtencion: "En taller", adicionales: ["Revisión de batería"], descripcion: "Luz del check engine encendida", estado: "En revisión" }
];

let sesion = null;

// Contador de intentos fallidos de login por usuario
let intentosFallidos = {};
const MAX_INTENTOS = 3;

/* ==================== LOCALSTORAGE (persistencia) ==================== */

const CLAVE_SOLICITUDES = "taller_solicitudes";
const CLAVE_USUARIOS   = "taller_usuarios";

// Cargar datos guardados en el navegador (si existen)
function cargarDatos() {

    const guardadas = localStorage.getItem(CLAVE_SOLICITUDES);

    if (guardadas) {
        solicitudes = JSON.parse(guardadas);
    }

    const estadosUsuarios = localStorage.getItem(CLAVE_USUARIOS);

    if (estadosUsuarios) {
        const estados = JSON.parse(estadosUsuarios);
        USUARIOS.forEach(function (u) {
            if (estados[u.usuario] !== undefined) {
                u.habilitado = estados[u.usuario];
            }
        });
    }

}

// Guardar solicitudes y estados de usuario en localStorage
function guardarDatos() {

    localStorage.setItem(CLAVE_SOLICITUDES, JSON.stringify(solicitudes));

    const estados = {};
    USUARIOS.forEach(function (u) {
        estados[u.usuario] = u.habilitado;
    });
    localStorage.setItem(CLAVE_USUARIOS, JSON.stringify(estados));

}

/* ==================== MÓDULO 1: CATÁLOGO DE SERVICIOS (map) ==================== */

const SERVICIOS = [
    { icono: "🛢️", nombre: "Cambio de aceite",      desc: "Aceite sintético con cambio de filtro incluido.", precio: "$35"  },
    { icono: "🛑", nombre: "Frenos",                desc: "Pastillas, discos y líquido de frenos.",          precio: "$60"  },
    { icono: "🔩", nombre: "Suspensión",            desc: "Amortiguadores, bujes y terminales.",             precio: "$80"  },
    { icono: "💻", nombre: "Escaneo electrónico",   desc: "Diagnóstico computarizado de fallas.",            precio: "$25"  },
    { icono: "🚗", nombre: "Mantenimiento general", desc: "Revisión completa de 21 puntos.",                 precio: "$120" },
    { icono: "🛞", nombre: "Alineación y balanceo", desc: "Alineación 3D y balanceo de ruedas.",             precio: "$40"  }
];

function cargarCatalogo() {

    const catalogo = document.getElementById("catalogoServicios");

    catalogo.innerHTML = SERVICIOS.map(function (s) {

        return '<div class="tarjeta-servicio">' +
            '<div class="icono">' + s.icono + '</div>' +
            '<h4>' + s.nombre + '</h4>' +
            '<p>' + s.desc + '</p>' +
            '<span class="precio">Desde ' + s.precio + '</span>' +
            '</div>';

    }).join("");

}

/* ==================== NAVEGACIÓN ENTRE SECCIONES ==================== */

function mostrarSeccion(id) {

    // Solo el administrador entra a Administración y Usuarios
    if ((id === "admin" || id === "usuarios") && (!sesion || sesion.rol !== "administrador")) {
        Swal.fire({
            icon: "error",
            title: "Acceso denegado",
            text: "Esta sección es exclusiva del Administrador."
        });
        return;
    }

    // "Mis mantenimientos" es exclusivo del cliente
    if (id === "misMantenimientos" && sesion && sesion.rol === "administrador") {
        Swal.fire({
            icon: "info",
            title: "Sección no disponible",
            text: "El administrador gestiona las solicitudes desde Administración."
        });
        id = "admin";
    }

    // Las secciones internas requieren sesión
    if (["solicitud", "misMantenimientos", "perfil", "usuarios"].indexOf(id) !== -1 && !sesion) {
        Swal.fire({
            icon: "warning",
            title: "Sesión requerida",
            text: "Debes iniciar sesión para acceder a esta sección."
        });
        id = "login";
    }

    document.querySelectorAll(".seccion").forEach(function (s) {
        s.classList.add("oculto");
    });

    document.getElementById(id).classList.remove("oculto");

    if (id === "misMantenimientos") {
        renderMisMantenimientos();
    }

    if (id === "admin") {
        renderAdmin();
    }

    if (id === "usuarios") {
        renderUsuarios();
    }

    if (id === "perfil") {
        renderPerfil();
    }

    if (id === "solicitud") {
        prepararFormulario();
    }

}

function actualizarNavegacion() {

    document.querySelectorAll(".nav-requerido").forEach(function (e) {
        e.classList.toggle("oculto", !sesion);
    });

    document.querySelectorAll(".nav-invitado").forEach(function (e) {
        e.classList.toggle("oculto", !!sesion);
    });

    document.querySelectorAll(".nav-admin").forEach(function (e) {
        e.classList.toggle("oculto", !(sesion && sesion.rol === "administrador"));
    });

    // "Mis mantenimientos" no aplica para el administrador
    document.querySelectorAll(".nav-solo-cliente").forEach(function (e) {
        e.classList.toggle("oculto", !!(sesion && sesion.rol === "administrador"));
    });

}

/* ==================== MÓDULO 3: LOGIN ==================== */

const formularioLogin = document.getElementById("formularioLogin");

formularioLogin.addEventListener("submit", function (evento) {

    evento.preventDefault();

    const usuarioIngresado = document.getElementById("usuario").value.trim().toLowerCase();
    const passwordIngresada = document.getElementById("password").value;

    console.log(usuarioIngresado, passwordIngresada, USUARIOS);
    const encontrado = USUARIOS.find(function (u) {
        return u.usuario.toLowerCase() === usuarioIngresado;
    });

    if (!encontrado) {
        Swal.fire({
            icon: "error",
            title: "Acceso incorrecto",
            text: "Usuario o contraseña incorrectos."
        });
        return;
    }

    // Contraseña incorrecta: contar intentos y bloquear tras MAX_INTENTOS
    if (encontrado.password !== passwordIngresada) {

        intentosFallidos[encontrado.usuario] =
            (intentosFallidos[encontrado.usuario] || 0) + 1;

        if (intentosFallidos[encontrado.usuario] >= MAX_INTENTOS) {

            encontrado.habilitado = false;
            intentosFallidos[encontrado.usuario] = 0;
            guardarDatos();

            Swal.fire({
                icon: "error",
                title: "Cuenta bloqueada",
                html: 'La cuenta <strong>"' + encontrado.usuario + '"</strong> fue ' +
                    "deshabilitada tras " + MAX_INTENTOS +
                    " intentos fallidos.<br>Solo el administrador puede habilitarla."
            });

        } else {

            Swal.fire({
                icon: "warning",
                title: "Contraseña incorrecta",
                text: "Intentos restantes antes del bloqueo: " +
                    (MAX_INTENTOS - intentosFallidos[encontrado.usuario])
            });

        }

        return;

    }

    if (!encontrado.habilitado) {
        Swal.fire({
            icon: "error",
            title: "Acceso denegado",
            text: 'La cuenta "' + usuarioIngresado + '" está deshabilitada.'
        });
        return;
    }

    // Login exitoso: reiniciar contador de intentos
    intentosFallidos[encontrado.usuario] = 0;

    sesion = encontrado;

    actualizarNavegacion();

    Swal.fire({
        icon: "success",
        title: "¡Bienvenido!",
        text: encontrado.nombre + " (" + encontrado.rol + ")"
    });

    mostrarSeccion("perfil");

});

function cerrarSesion() {

    sesion = null;

    actualizarNavegacion();

    mostrarSeccion("inicio");

}

/* ==================== PERFIL ==================== */

function renderPerfil() {

    const contenedor = document.getElementById("datosPerfil");

    let rolColor = sesion.rol === "administrador" ? "badge-cancelado" : "badge-revision";

    contenedor.innerHTML =
        '<p><strong>Usuario:</strong> ' + sesion.usuario + '</p>' +
        '<p><strong>Nombre:</strong> ' + sesion.nombre + '</p>' +
        '<p><strong>Rol:</strong> <span class="' + rolColor + '">' + sesion.rol + '</span></p>' +
        '<p><strong>Teléfono:</strong> ' + sesion.telefono + '</p>' +
        '<p><strong>Email:</strong> ' + sesion.email + '</p>';

}

/* ==================== MÓDULO 2: VALIDACIONES Y REGISTRO ==================== */

const formularioSolicitud = document.getElementById("formularioSolicitud");
const resultado = document.getElementById("resultado");
const mensaje = document.getElementById("mensajeResultado");

function prepararFormulario() {

    // Ocultar el resultado de una operación anterior
    resultado.classList.add("oculto");

    // El administrador puede registrar solicitudes para cualquier cliente
    const grupoCliente = document.getElementById("grupoClienteAdmin");

    if (sesion.rol === "administrador") {

        grupoCliente.classList.remove("oculto");

        const selectCliente = document.getElementById("cliente");

        selectCliente.innerHTML = '<option value="">Selecciona un cliente...</option>';

        USUARIOS.filter(function (u) {
            return u.rol === "cliente" && u.habilitado;
        }).forEach(function (u) {
            selectCliente.innerHTML += '<option value="' + u.usuario + '">' +
                u.nombre + ' (' + u.usuario + ')</option>';
        });

    } else {

        grupoCliente.classList.add("oculto");

        // Pre-llenar los datos del cliente autenticado
        document.getElementById("nombre").value = sesion.nombre;
        document.getElementById("correo").value = sesion.email;
        document.getElementById("telefono").value = sesion.telefono;

    }

}

formularioSolicitud.addEventListener("submit", function (evento) {

    evento.preventDefault();

    // Obtener datos del cliente
    const nombre = document.getElementById("nombre").value.trim();
    const correo = document.getElementById("correo").value.trim();
    const telefono = document.getElementById("telefono").value.trim();

    // Obtener datos del automóvil
    const placa = document.getElementById("placa").value.trim().toUpperCase();
    const marca = document.getElementById("marca").value.trim();
    const modelo = document.getElementById("modelo").value.trim();
    const anio = parseInt(document.getElementById("anio").value);
    const kilometraje = parseInt(document.getElementById("kilometraje").value);

    // Obtener tipo de servicio
    const servicio = document.getElementById("servicio").value;

    // Obtener fecha y hora
    const fecha = document.getElementById("fecha").value;
    const hora = document.getElementById("hora").value;

    // Obtener tipo de atención (radio buttons)
    const tipoAtencion = document.querySelector(
        "input[name='tipoAtencion']:checked"
    );

    // CHECK LIST de servicios adicionales (checkboxes)
    const adicionalesSeleccionados = document.querySelectorAll(
        "input[name='adicionales']:checked"
    );

    // Obtener descripción (textarea)
    const descripcion = document.getElementById("descripcion").value.trim();

    // Obtener id oculto (solo cuando se está editando)
    const idEdicion = document.getElementById("solId").value;

    /* ---------- VALIDACIONES ---------- */

    const errores = [];

    const anioActual = new Date().getFullYear();
    const hoy = new Date().toISOString().split("T")[0];

    if (!nombre || nombre.length < 3) {
        errores.push("El nombre debe tener al menos 3 caracteres.");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
        errores.push("El correo electrónico no tiene un formato válido.");
    }

    if (telefono.length !== 10 || isNaN(telefono)) {
        errores.push("El teléfono debe tener 10 dígitos numéricos.");
    }

    // Formato de placa: 3 letras, guion, 4 números (ej. ABC-1234)
    const formatoPlaca = /^[A-Z]{3}-\d{4}$/;

    if (!formatoPlaca.test(placa)) {
        errores.push("La placa debe tener el formato ABC-1234.");
    }

    if (!marca || !modelo) {
        errores.push("Marca y modelo son obligatorios.");
    }

    if (isNaN(anio) || anio < 1950 || anio > anioActual) {
        errores.push("El año debe estar entre 1950 y " + anioActual + ".");
    }

    if (isNaN(kilometraje) || kilometraje < 0 || kilometraje > 500000) {
        errores.push("El kilometraje debe estar entre 0 y 500000.");
    }

    if (servicio === "") {
        errores.push("Debe seleccionar un tipo de servicio.");
    }

    if (fecha === "") {
        errores.push("La fecha es obligatoria.");
    } else if (fecha < hoy && idEdicion === "") {
        errores.push("La fecha no puede ser anterior a hoy.");
    }

    if (hora === "") {
        errores.push("La hora es obligatoria.");
    } else if (hora < "08:00" || hora > "17:00") {
        errores.push("El horario de atención es de 08:00 a 17:00.");
    }

    if (descripcion.length < 10) {
        errores.push("La descripción debe tener al menos 10 caracteres.");
    }

    if (errores.length > 0) {
        Swal.fire({
            icon: "error",
            title: "Solicitud inválida",
            html: "<ul style='text-align:left;'>" +
                errores.map(function (e) { return "<li>" + e + "</li>"; }).join("") +
                "</ul>"
        });
        return;
    }

    /* ---------- OBTENER ADICIONALES SELECCIONADOS ---------- */

    let adicionales = [];

    adicionalesSeleccionados.forEach(function (opcion) {
        adicionales.push(opcion.value);
    });

    /* ---------- DETERMINAR PROPIETARIO ---------- */

    let propietario;

    if (sesion.rol === "administrador") {
        propietario = document.getElementById("cliente").value;
        if (propietario === "") {
            Swal.fire({
                icon: "warning",
                title: "Cliente requerido",
                text: "Debe seleccionar un cliente."
            });
            return;
        }
    } else {
        propietario = sesion.usuario;
    }

    /* ---------- CREAR O ACTUALIZAR EL REGISTRO ---------- */

    if (idEdicion !== "") {

        // ACTUALIZAR (solo administrador)
        const indice = solicitudes.findIndex(function (s) {
            return s.id === parseInt(idEdicion);
        });

        if (indice !== -1) {

            const estadoPrevio = solicitudes[indice].estado;

            solicitudes[indice] = {
                id: parseInt(idEdicion),
                propietario: propietario,
                nombre: nombre,
                email: correo,
                telefono: telefono,
                placa: placa,
                marca: marca,
                modelo: modelo,
                anio: anio,
                kilometraje: kilometraje,
                servicio: servicio,
                fecha: fecha,
                hora: hora,
                tipoAtencion: tipoAtencion.value,
                adicionales: adicionales,
                descripcion: descripcion,
                estado: estadoPrevio
            };

            guardarDatos();

            mensaje.innerHTML =
                "<strong>Solicitud actualizada:</strong> #" + idEdicion;

        }

    } else {

        // CREAR: identificador único autoincremental y estado inicial
        let nuevoId = 1;

        if (solicitudes.length > 0) {
            nuevoId = Math.max.apply(null, solicitudes.map(function (s) {
                return s.id;
            })) + 1;
        }

        solicitudes.push({
            id: nuevoId,
            propietario: propietario,
            nombre: nombre,
            email: correo,
            telefono: telefono,
            placa: placa,
            marca: marca,
            modelo: modelo,
            anio: anio,
            kilometraje: kilometraje,
            servicio: servicio,
            fecha: fecha,
            hora: hora,
            tipoAtencion: tipoAtencion.value,
            adicionales: adicionales,
            descripcion: descripcion,
            estado: "Pendiente"
        });

        mensaje.innerHTML =
            "<strong>Solicitud registrada con éxito.</strong><br>" +
            "ID: #" + nuevoId +
            "<br><strong>Cliente:</strong> " + nombre +
            "<br><strong>Vehículo:</strong> " + marca + " " + modelo + " (" + placa + ")" +
            "<br><strong>Servicio:</strong> " + servicio +
            "<br><strong>Fecha:</strong> " + fecha + " a las " + hora +
            "<br><strong>Atención:</strong> " + tipoAtencion.value +
            "<br><strong>Adicionales:</strong> " + (adicionales.length ? adicionales.join(", ") : "Ninguno") +
            "<br><strong>Estado:</strong> Pendiente";

        guardarDatos();

    }

    // Limpiar el formulario y mostrar resultado
    // (reset() dispara el evento 'reset' que oculta el resultado,
    //  por eso se vuelve a mostrar DESPUÉS de resetear)
    formularioSolicitud.reset();
    document.getElementById("solId").value = "";
    document.getElementById("btnGuardar").textContent = "Guardar solicitud";
    document.getElementById("btnCancelarEdicion").classList.add("oculto");

    resultado.classList.remove("oculto");

});

// Método para cancelar la edición
function cancelarEdicion() {

    formularioSolicitud.reset();
    document.getElementById("solId").value = "";
    document.getElementById("btnGuardar").textContent = "Guardar solicitud";
    document.getElementById("btnCancelarEdicion").classList.add("oculto");
    resultado.classList.add("oculto");

}

// Ocultar el resultado cuando se limpia el formulario
formularioSolicitud.addEventListener("reset", function () {

    resultado.classList.add("oculto");

});

/* ==================== MÓDULO 3: VISTA CLIENTE (filter) ==================== */

function badgeEstado(estado) {

    const clases = {
        "Pendiente":   "badge-pendiente",
        "En revisión": "badge-revision",
        "En proceso":  "badge-proceso",
        "Finalizado":  "badge-finalizado",
        "Cancelado":   "badge-cancelado"
    };

    const clase = clases[estado] || "badge-pendiente";

    return '<span class="' + clase + '">' + estado + '</span>';

}

function renderMisMantenimientos() {

    // El cliente SOLO ve sus propias solicitudes
    const propios = solicitudes.filter(function (s) {
        return s.propietario === sesion.usuario;
    });

    const tbody = document.getElementById("tablaMisMantenimientos");

    if (propios.length === 0) {
        tbody.innerHTML =
            '<tr><td colspan="7" style="text-align:center;color:dimgray;">' +
            "No tienes mantenimientos registrados.</td></tr>";
        return;
    }

    let filas = "";

    propios.forEach(function (s) {

        filas += "<tr>" +
            "<td>#" + s.id + "</td>" +
            "<td>" + s.placa + "</td>" +
            "<td>" + s.marca + " " + s.modelo + " (" + s.anio + ")</td>" +
            "<td>" + s.servicio + "</td>" +
            "<td>" + s.fecha + "</td>" +
            "<td>" + s.hora + "</td>" +
            "<td>" + badgeEstado(s.estado) + "</td>" +
            "</tr>";

    });

    tbody.innerHTML = filas;

}

/* ==================== MÓDULO 3: CRUD ADMINISTRADOR ==================== */

function renderAdmin() {

    const tbody = document.getElementById("tablaAdmin");

    if (solicitudes.length === 0) {
        tbody.innerHTML =
            '<tr><td colspan="9" style="text-align:center;color:dimgray;">' +
            "No hay solicitudes en el sistema.</td></tr>";
        return;
    }

    let filas = "";

    solicitudes.forEach(function (s) {

        // Select de estados para cambiar el estado del registro
        let selectEstados = '<select onchange="cambiarEstado(' + s.id + ', this.value)">';

        ESTADOS.forEach(function (e) {
            selectEstados += '<option value="' + e + '"' +
                (e === s.estado ? " selected" : "") + ">" + e + "</option>";
        });

        selectEstados += "</select>";

        filas += "<tr>" +
            "<td>#" + s.id + "</td>" +
            "<td>" + s.nombre + "<br><small>@" + s.propietario + "</small></td>" +
            "<td>" + s.placa + "</td>" +
            "<td>" + s.marca + " " + s.modelo + " (" + s.anio + ")</td>" +
            "<td>" + s.servicio + "</td>" +
            "<td>" + s.fecha + "</td>" +
            "<td>" + s.hora + "</td>" +
            "<td>" + selectEstados + "</td>" +
            '<td><button type="button" class="btn-editar" onclick="editarSolicitud(' + s.id + ')">Editar</button> ' +
            '<button type="button" class="btn-eliminar" onclick="eliminarSolicitud(' + s.id + ')">Eliminar</button></td>' +
            "</tr>";

    });

    tbody.innerHTML = filas;

}

// CAMBIO DE ESTADO (Update)
function cambiarEstado(id, nuevoEstado) {

    const s = solicitudes.find(function (x) {
        return x.id === id;
    });

    if (s) {
        s.estado = nuevoEstado;
        guardarDatos();
        renderAdmin();
        Swal.fire({
            icon: "success",
            title: "Estado actualizado",
            text: "Solicitud #" + id + " → " + nuevoEstado,
            timer: 1500,
            showConfirmButton: false
        });
    }

}

// CARGAR REGISTRO EN EL FORMULARIO PARA EDITAR (Update)
function editarSolicitud(id) {

    const s = solicitudes.find(function (x) {
        return x.id === id;
    });

    if (!s) {
        return;
    }

    mostrarSeccion("solicitud");

    document.getElementById("solId").value = s.id;
    document.getElementById("nombre").value = s.nombre;
    document.getElementById("correo").value = s.email;
    document.getElementById("telefono").value = s.telefono;
    document.getElementById("placa").value = s.placa;
    document.getElementById("marca").value = s.marca;
    document.getElementById("modelo").value = s.modelo;
    document.getElementById("anio").value = s.anio;
    document.getElementById("kilometraje").value = s.kilometraje;
    document.getElementById("servicio").value = s.servicio;
    document.getElementById("fecha").value = s.fecha;
    document.getElementById("hora").value = s.hora;
    document.getElementById("descripcion").value = s.descripcion;

    document.querySelector(
        "input[name='tipoAtencion'][value='" + s.tipoAtencion + "']"
    ).checked = true;

    document.querySelectorAll("input[name='adicionales']").forEach(function (c) {
        c.checked = s.adicionales.indexOf(c.value) !== -1;
    });

    if (sesion.rol === "administrador") {
        document.getElementById("cliente").value = s.propietario;
    }

    document.getElementById("btnGuardar").textContent = "Actualizar solicitud";
    document.getElementById("btnCancelarEdicion").classList.remove("oculto");

    window.scrollTo(0, 0);

}

// ELIMINAR CON CONFIRMACIÓN (Delete)
function eliminarSolicitud(id) {

    Swal.fire({
        icon: "warning",
        title: "¿Eliminar solicitud?",
        text: "Se eliminará la solicitud #" + id + ". Esta acción no se puede revertir.",
        showCancelButton: true,
        confirmButtonText: "Sí, eliminar",
        cancelButtonText: "Cancelar"
    }).then(function (result) {

        if (result.isConfirmed) {

            solicitudes = solicitudes.filter(function (s) {
                return s.id !== id;
            });

            guardarDatos();
            renderAdmin();

            Swal.fire({
                icon: "success",
                title: "Eliminada",
                text: "La solicitud #" + id + " fue eliminada.",
                timer: 1500,
                showConfirmButton: false
            });

        }

    });

}

/* ==================== MÓDULO 3: GESTIÓN DE USUARIOS (ADMIN) ==================== */

function renderUsuarios() {

    const tbody = document.getElementById("tablaUsuarios");

    let filas = "";

    USUARIOS.forEach(function (u) {

        let badge = u.habilitado
            ? '<span class="badge-finalizado">Habilitado</span>'
            : '<span class="badge-cancelado">Deshabilitado</span>';

        let boton = u.usuario === sesion.usuario
            ? '<small>Tu cuenta</small>'
            : '<button type="button" class="btn-editar" onclick="toggleUsuario(\'' + u.usuario + '\')">' +
              (u.habilitado ? "Deshabilitar" : "Habilitar") + '</button>';

        filas += "<tr>" +
            "<td>" + u.usuario + "</td>" +
            "<td>" + u.nombre + "</td>" +
            "<td>" + u.rol + "</td>" +
            "<td>" + badge + "</td>" +
            "<td>" + boton + "</td>" +
            "</tr>";

    });

    tbody.innerHTML = filas;

}

// Habilitar o deshabilitar una cuenta (solo administrador)
function toggleUsuario(usuario) {

    const u = USUARIOS.find(function (x) {
        return x.usuario === usuario;
    });

    if (!u) {
        return;
    }

    u.habilitado = !u.habilitado;

    if (u.habilitado) {
        intentosFallidos[u.usuario] = 0;
    }

    guardarDatos();
    renderUsuarios();

    Swal.fire({
        icon: "success",
        title: "Cuenta actualizada",
        text: 'La cuenta "' + u.usuario + '" ahora está ' +
            (u.habilitado ? "HABILITADA" : "DESHABILITADA") + "."
    });

}

/* ==================== INICIALIZACIÓN ==================== */

cargarDatos();
cargarCatalogo();
actualizarNavegacion();
mostrarSeccion("inicio");