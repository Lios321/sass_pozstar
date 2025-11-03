const { PrismaClient, ServiceOrderStatus } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function pad(num, size) {
  let s = String(num);
  while (s.length < size) s = '0' + s;
  return s;
}

async function main() {
  console.log('🌱 Seed de audio profesional: iniciando...');

  // Limpiar datos existentes
  await prisma.notification.deleteMany();
  await prisma.receiptDelivery.deleteMany();
  await prisma.serviceOrder.deleteMany();
  await prisma.technician.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Datos anteriores eliminados');

  const hashed = await bcrypt.hash('123456', 10);

  // Usuarios
  const admin = await prisma.user.create({
    data: { name: 'Administrador', email: 'admin@pozstar.com', password: hashed, role: 'ADMIN' }
  });

  const techUsers = await prisma.$transaction([
    prisma.user.create({ data: { name: 'Técnico A', email: 'tec.a@pozstar.com', password: hashed, role: 'TECHNICIAN' } }),
    prisma.user.create({ data: { name: 'Técnico B', email: 'tec.b@pozstar.com', password: hashed, role: 'TECHNICIAN' } }),
    prisma.user.create({ data: { name: 'Técnico C', email: 'tec.c@pozstar.com', password: hashed, role: 'TECHNICIAN' } }),
  ]);

  console.log('👥 Usuarios creados');

  // Técnicos (perfil)
  const specSets = [
    ['Caixas de Som', 'Subwoofers', 'Amplificadores'],
    ['Mesas de Som', 'Equalizadores', 'Crossover'],
    ['Microfones', 'Processadores', 'Consoles Digitais']
  ];
  const technicians = await prisma.$transaction([
    prisma.technician.create({ data: { name: 'Técnico A', email: 'tec.a@pozstar.com', phone: '(11) 90000-0001', specializations: JSON.stringify(specSets[0]) } }),
    prisma.technician.create({ data: { name: 'Técnico B', email: 'tec.b@pozstar.com', phone: '(11) 90000-0002', specializations: JSON.stringify(specSets[1]) } }),
    prisma.technician.create({ data: { name: 'Técnico C', email: 'tec.c@pozstar.com', phone: '(11) 90000-0003', specializations: JSON.stringify(specSets[2]) } }),
  ]);

  console.log('🛠️ Técnicos creados');

  // Clientes (10)
  const cities = ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba', 'Porto Alegre'];
  const clients = [];
  for (let i = 1; i <= 10; i++) {
    const client = await prisma.client.create({
      data: {
        name: `Cliente ${i}`,
        email: `cliente${i}@email.com`,
        phone: `(11) 9${pad(i, 4)}-${pad(i * 111, 4)}`,
        address: `Rua Exemplo ${i}, ${randInt(10, 999)} - ${pick(cities)}, BR`,
        city: pick(cities),
        state: 'SP',
        country: 'Brasil'
      }
    });
    clients.push(client);
  }

  console.log('👤 10 clientes creados');

  // Catálogo de audio profesional
  const equipmentTypes = ['Caixa de Som', 'Mesa de Som', 'Amplificador', 'Microfone', 'Equalizador', 'Processador', 'Subwoofer', 'Crossover', 'Potência', 'Console Digital'];
  const brands = ['Behringer', 'Yamaha', 'Soundcraft', 'Shure', 'Sennheiser', 'JBL', 'QSC', 'Allen & Heath'];
  const defects = [
    'Ruido constante', 'Canal sin sonido', 'Distorsión en altas', 'No enciende', 'Falla intermitente',
    'Conector suelto', 'Firmware corrupto', 'Potencia caída', 'Clipping al máximo', 'Microfonía excesiva'
  ];
  const accessories = ['Fuente', 'Cables XLR', 'Cables TRS', 'Rack', 'Case', 'Controlador', 'Adaptadores'];

  const explanationSnippets = [
    'Se detectó driver dañado en frecuencia media.',
    'Capacitores en etapa de preamplificación fuera de especificación.',
    'Entrada balanceada con soldadura fría; requiere retrabajo.',
    'DSP con configuración corrupta; reprogramado y testeado.',
    'Fuente con ripple elevado; reemplazo de puente rectificador.',
    'Potencia con protección activada por corto en salida.',
    'Crossover con filtro mal calibrado; ajuste de parámetros.',
    'Mixer con fader con ruido; limpieza y lubricación.',
    'Mic cápsula con sensibilidad reducida; sustitución recomendada.',
    'Sub con bobina descentrada; realineación realizada.'
  ];

  // Estados distribuidos
  const statuses = [
    ServiceOrderStatus.SEM_VER,
    ServiceOrderStatus.ORCAMENTAR,
    ServiceOrderStatus.APROVADO,
    ServiceOrderStatus.ESPERANDO_PECAS,
    ServiceOrderStatus.COMPRADO,
    ServiceOrderStatus.MELHORAR,
    ServiceOrderStatus.TERMINADO,
    ServiceOrderStatus.SEM_PROBLEMA,
    ServiceOrderStatus.SEM_CONSERTO,
    ServiceOrderStatus.DEVOLVER,
    ServiceOrderStatus.DEVOLVIDO,
    ServiceOrderStatus.DESCARTE,
    ServiceOrderStatus.VENDIDO,
    ServiceOrderStatus.ESPERANDO_CLIENTE,
  ];

  console.log('📋 Creando 250 órdenes de servicio...');
  const orders = [];
  for (let i = 1; i <= 250; i++) {
    const client = pick(clients);
    const tech = Math.random() < 0.8 ? pick(technicians) : null; // 80% asignadas
    const status = pick(statuses);

    const createdDaysAgo = randInt(5, 300);
    const arrivalDate = new Date(Date.now() - createdDaysAgo * 24 * 60 * 60 * 1000);
    const openingDate = new Date(arrivalDate.getTime() + randInt(0, 2) * 24 * 60 * 60 * 1000);

    let completionDate = null;
    let deliveryDate = null;
    let paymentDate = null;
    let budgetNote = null;
    let technicalExplanation = Math.random() < 0.7 ? pick(explanationSnippets) : null;

    // Fechas según estado
    if ([ServiceOrderStatus.TERMINADO, ServiceOrderStatus.DEVOLVIDO, ServiceOrderStatus.VENDIDO].includes(status)) {
      completionDate = new Date(openingDate.getTime() + randInt(1, 20) * 24 * 60 * 60 * 1000);
    }
    if ([ServiceOrderStatus.DEVOLVIDO, ServiceOrderStatus.VENDIDO].includes(status)) {
      deliveryDate = new Date((completionDate || openingDate).getTime() + randInt(1, 10) * 24 * 60 * 60 * 1000);
      paymentDate = Math.random() < 0.6 ? new Date(deliveryDate.getTime() + randInt(0, 3) * 24 * 60 * 60 * 1000) : null;
    }
    if ([ServiceOrderStatus.ORCAMENTAR, ServiceOrderStatus.APROVADO].includes(status)) {
      budgetNote = Math.random() < 0.5 ? `Orçamento ${Math.random() < 0.5 ? 'aprovado' : 'pendente'}: R$ ${randInt(150, 2500)}.00` : null;
    }

    const data = {
      orderNumber: `OS-2024-${pad(i, 3)}`,
      clientId: client.id,
      technicianId: tech ? tech.id : null,
      equipmentType: pick(equipmentTypes),
      brand: pick(brands),
      model: `Modelo ${randInt(100, 999)}`,
      serialNumber: `SN${randInt(100000, 999999)}`,
      status,
      reportedDefect: pick(defects),
      receivedAccessories: Math.random() < 0.7 ? pick(accessories) : null,
      budgetNote,
      technicalExplanation,
      arrivalDate,
      openingDate,
      completionDate,
      deliveryDate,
      paymentDate,
      createdById: admin.id,
    };

    orders.push(data);
  }

  // Crear en lotes para eficiencia
  for (let j = 0; j < orders.length; j += 50) {
    const chunk = orders.slice(j, j + 50);
    await prisma.serviceOrder.createMany({ data: chunk });
    console.log(`  → Insertadas ${Math.min(j + 50, orders.length)} órdenes`);
  }

  console.log('✅ Seed finalizado con éxito');
  const [uCount, cCount, tCount, soCount] = await Promise.all([
    prisma.user.count(),
    prisma.client.count(),
    prisma.technician.count(),
    prisma.serviceOrder.count(),
  ]);
  console.log(`📊 Resumen: Usuarios=${uCount}, Clientes=${cCount}, Técnicos=${tCount}, Órdenes=${soCount}`);
  console.log('🔑 Credenciales: admin@pozstar.com / 123456');
}

main()
  .catch((e) => { console.error('❌ Error en seed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
