package br.com.senac.backend.utils;

import br.com.senac.backend.models.PaymentMethod;
import br.com.senac.backend.models.Role;
import br.com.senac.backend.models.ServiceLocation;
import br.com.senac.backend.models.ServiceStatus;
import br.com.senac.backend.models.ServiceType;
import br.com.senac.backend.models.entities.Account;
import br.com.senac.backend.models.entities.Item;
import br.com.senac.backend.models.entities.Sale;
import br.com.senac.backend.models.entities.ServiceOrder;
import br.com.senac.backend.models.request.SaleRequest;
import br.com.senac.backend.models.request.ServiceRequest;
import br.com.senac.backend.models.response.ServiceResponse;
import br.com.senac.backend.repository.AccountRepository;
import br.com.senac.backend.repository.ItemRepository;
import br.com.senac.backend.repository.ServiceOrderRepository;
import br.com.senac.backend.service.SaleService;
import br.com.senac.backend.service.ServiceOrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

// Enche o banco com estoque, vendas e serviços de demonstração para os dashboards ficarem cheios.
// Só roda com DEMO_SEED=true (no .env ou no ambiente) e só se o estoque estiver vazio, então não duplica nada.
// Passa pelos services de verdade (estoque, custo congelado e totais seguem as regras reais) e depois
// retroage as datas, para o histórico ficar espalhado pelos últimos dias, com bastante movimento em "hoje".
// Tudo numa transação: se algo falhar, nada fica gravado. A semente do Random é fixa: mesmos dados a cada execução.
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "DEMO_SEED", havingValue = "true")
public class DemoDataSeeder {

    private final AccountRepository accounts;
    private final ItemRepository items;
    private final ServiceOrderRepository serviceRepo;
    private final SaleService sales;
    private final ServiceOrderService services;
    private final PlatformTransactionManager txManager;

    // Quantos dias para trás o histórico vai (além de hoje)
    private static final int HISTORY_DAYS = 21;
    // Estoque inicial só durante a simulação, grande o bastante para nenhuma venda/serviço faltar peça.
    // No fim cada item recebe o estoque "atual" do catálogo abaixo
    private static final int SIMULATION_STOCK = 500;

    // stock = estoque atual que vai aparecer na tela; weight = o quanto o item sai nas vendas; maxQty = máximo por venda.
    // Itens com stock <= minStock aparecem como "abaixo do mínimo" (e 0 como "sem estoque") nos avisos da Home
    private record Part(String code, String name, String brand, String description, String cost, String price,
                        int stock, int minStock, int weight, int maxQty) {}

    private static final List<Part> CATALOG = List.of(
            // Chaves virgens
            new Part("CHV-001", "Chave Yale simples", "Silca", "Chave virgem para cópia, perfil Yale", "1.20", "5.00", 148, 40, 10, 4),
            new Part("CHV-002", "Chave Tetra", "Silca", "Chave virgem para fechadura tetra", "1.80", "7.00", 96, 30, 8, 3),
            new Part("CHV-003", "Chave Gorje multiponto", "Stam", "Chave virgem de segredo multiponto", "2.40", "9.00", 12, 25, 5, 3),
            // Chaves automotivas
            new Part("AUT-001", "Chave canivete VW (virgem)", "Silca", "Chave canivete sem corte, linha VW", "22.00", "65.00", 14, 8, 2, 1),
            new Part("AUT-002", "Chave Fiat Linea (virgem)", "Silca", "Chave sem corte para Fiat Linea", "18.00", "55.00", 11, 8, 2, 1),
            new Part("AUT-003", "Chave com chip transponder ID48", "Silca", "Chave com chip de imobilizador ID48", "28.00", "90.00", 3, 6, 1, 1),
            new Part("AUT-004", "Capa de chave Honda", "Silca", "Capa para chave canivete Honda", "12.00", "40.00", 9, 5, 1, 1),
            // Controles remotos
            new Part("CTR-001", "Controle remoto portão 433 MHz", "PPA", "Controle de 3 botões para motor de portão", "18.00", "55.00", 22, 10, 3, 2),
            new Part("CTR-002", "Controle remoto Rolling Code", "Garen", "Controle de código variável, 4 botões", "24.00", "70.00", 17, 8, 2, 2),
            new Part("CTR-003", "Controle de alarme automotivo", "Positron", "Controle original para alarmes Positron", "32.00", "95.00", 0, 5, 1, 1),
            // Fechaduras
            new Part("FCH-001", "Fechadura externa 40 mm", "Stam", "Fechadura de porta externa com cilindro", "38.00", "89.90", 18, 6, 2, 1),
            new Part("FCH-002", "Fechadura de banheiro", "Papaiz", "Fechadura com trava interna para banheiro", "29.00", "69.90", 13, 6, 2, 1),
            new Part("FCH-003", "Fechadura digital biométrica", "Intelbras", "Abre por digital, senha e chave de emergência", "420.00", "699.00", 4, 2, 1, 1),
            new Part("FCH-004", "Fechadura de embutir", "Pado", "Fechadura de embutir para porta de madeira", "54.00", "119.90", 7, 4, 1, 1),
            // Cilindros e miolos
            new Part("CIL-001", "Miolo cilindro 30/30 latão", "Pado", "Miolo de latão, 30 mm por lado", "15.00", "42.00", 31, 10, 3, 2),
            new Part("CIL-002", "Cilindro de segurança tetra 60 mm", "Papaiz", "Cilindro de alta segurança, antichave-mestra", "46.00", "110.00", 4, 6, 1, 1),
            new Part("CIL-003", "Miolo para fechadura Yale", "Yale", "Miolo de reposição, perfil Yale", "12.00", "35.00", 26, 10, 2, 2),
            // Cadeados
            new Part("CAD-001", "Cadeado 25 mm latão", "Pado", "Cadeado pequeno com 2 chaves", "9.00", "24.90", 44, 12, 4, 2),
            new Part("CAD-002", "Cadeado 40 mm", "Papaiz", "Cadeado de latão maciço com haste de aço", "16.00", "39.90", 29, 10, 3, 1),
            new Part("CAD-003", "Cadeado de segredo 30 mm", "Stam", "Cadeado com segredo de 4 dígitos", "11.00", "29.90", 19, 8, 2, 1),
            // Peças de reposição
            new Part("PCS-001", "Mola de trinco", "Stam", "Mola de reposição para trinco de fechadura", "1.50", "6.00", 120, 30, 3, 3),
            new Part("PCS-002", "Contra-testa universal", "Papaiz", "Contra-testa de aço para batente", "3.00", "12.00", 9, 20, 2, 2),
            new Part("PCS-003", "Kit de parafusos para fechadura", "Pado", "Parafusos e buchas para instalação", "2.50", "9.90", 64, 20, 2, 2),
            // Baterias e pilhas
            new Part("BAT-001", "Bateria CR2032", "Panasonic", "Bateria de lítio para controles e chaves", "3.50", "12.00", 85, 30, 6, 2),
            new Part("BAT-002", "Bateria 23A 12 V", "Elgin", "Bateria para controles de portão e alarme", "4.00", "13.00", 0, 20, 4, 2),
            // Acessórios
            new Part("ACE-001", "Chaveiro personalizado", "Linha Miguel", "Chaveiro de metal com gravação", "2.00", "8.00", 72, 40, 3, 3),
            new Part("ACE-002", "Porta-chaves de couro", "Linha Miguel", "Porta-chaves com 6 ganchos", "6.00", "19.90", 25, 10, 1, 1),
            // Ferramentas e insumos
            new Part("FER-001", "Lubrificante de grafite", "Tekbond", "Grafite em pó para cilindros e fechaduras", "8.00", "21.00", 33, 10, 2, 1),
            new Part("FER-002", "Desengripante spray 300 ml", "WD-40", "Desengripante e lubrificante multiuso", "14.00", "32.00", 6, 6, 2, 1)
    );

    // Como cada tipo de serviço se comporta: faixa de valor, % atendido no local do cliente, frequência e peças usadas
    private record Profile(ServiceType type, int minValue, int maxValue, int onSitePercent, int weight,
                           List<String> partCodes, int maxQty) {}

    private static final List<Profile> PROFILES = List.of(
            new Profile(ServiceType.KEY_COPY, 15, 45, 0, 5, List.of("CHV-001", "CHV-002", "CHV-003"), 3),
            new Profile(ServiceType.KEY_MAKING, 60, 140, 0, 3, List.of("CHV-002", "CHV-003", "CIL-003"), 1),
            new Profile(ServiceType.UNLOCK_DOOR_VEHICLE_SAFE, 120, 320, 70, 2, List.of(), 0),
            new Profile(ServiceType.REPLACE_INSTALL_LOCK_CYLINDER, 110, 280, 30, 3,
                    List.of("CIL-001", "CIL-002", "FCH-001", "FCH-002", "FCH-004"), 1),
            new Profile(ServiceType.LOCK_REPAIR, 60, 180, 30, 3, List.of("PCS-001", "PCS-002", "PCS-003", "FER-001"), 2),
            new Profile(ServiceType.AUTOMOTIVE_KEY_PROGRAMMING, 180, 480, 50, 2,
                    List.of("AUT-001", "AUT-002", "AUT-003", "AUT-004"), 1),
            new Profile(ServiceType.DIGITAL_LOCK_INSTALLATION_MAINTENANCE, 780, 1100, 60, 1, List.of("FCH-003"), 1),
            new Profile(ServiceType.OTHER, 50, 150, 10, 1, List.of("ACE-001", "FER-002"), 1)
    );

    private static final List<String> FIRST_NAMES = List.of("Ana", "Bruno", "Carla", "Daniel", "Eduardo", "Fernanda",
            "Gabriel", "Helena", "Igor", "Juliana", "Lucas", "Mariana", "Nicolas", "Olívia", "Paulo", "Rafaela",
            "Sérgio", "Tatiane", "Vinícius", "Yasmin");
    private static final List<String> LAST_NAMES = List.of("Almeida", "Barbosa", "Cardoso", "Dias", "Esteves",
            "Ferreira", "Gomes", "Henrique", "Lima", "Martins", "Nogueira", "Oliveira", "Pereira", "Ribeiro",
            "Santos", "Teixeira", "Vieira", "Xavier");
    private static final List<String> STREETS = List.of("Rua das Acácias", "Av. Afonso Pena", "Rua Pernambuco",
            "Rua dos Timbiras", "Av. do Contorno", "Rua Sergipe", "Rua da Bahia", "Av. Getúlio Vargas");
    private static final List<String> DISTRICTS = List.of("Savassi", "Funcionários", "Centro", "Lourdes", "Santo Agostinho",
            "Serra");
    private static final List<String> NOTES = List.of("Cliente aguarda no local", "Avisar antes de iniciar o serviço",
            "Cliente pediu nota fiscal", "Chave original em mau estado", "Trazer ferramentas para porta blindada");

    private record PlannedSale(LocalDateTime at, SaleRequest request, boolean canceled) {}

    private record PlannedService(LocalDateTime at, ServiceRequest request, ServiceStatus status) {}

    // ApplicationReadyEvent e não CommandLineRunner: só dispara depois de todos os runners, então o AdminSeeder
    // já criou o administrador (a ordem entre runners sem @Order não é garantida)
    @EventListener(ApplicationReadyEvent.class)
    public void run() {
        String summary = new TransactionTemplate(txManager).execute(status -> seed());
        // Logado só depois do commit: se a transação falhar, esta linha não aparece
        if (summary != null) log.info("DEMO_SEED: {}", summary);
    }

    // Devolve o resumo do que foi criado, ou null se não criou nada
    private String seed() {
        if (items.count() > 0) {
            log.info("DEMO_SEED: o estoque já tem itens, nada foi adicionado.");
            return null;
        }
        List<Account> allAccounts = accounts.findAll();
        if (allAccounts.isEmpty()) {
            log.warn("DEMO_SEED: nenhuma conta cadastrada para ser a vendedora, nada foi adicionado.");
            return null;
        }
        // Quem vende no dia a dia é o funcionário; só cai no administrador se não houver funcionário
        List<Account> sellers = allAccounts.stream().filter(a -> a.getRole() == Role.EMPLOYEE).toList();
        if (sellers.isEmpty()) sellers = allAccounts;

        Random rnd = new Random(2026);
        LocalDateTime now = LocalDateTime.now().truncatedTo(ChronoUnit.SECONDS);

        Map<String, Item> stock = createItems();

        List<PlannedSale> plannedSales = planSales(rnd, now, stock);
        plannedSales.sort(Comparator.comparing(PlannedSale::at));
        for (PlannedSale planned : plannedSales) {
            Account seller = sellers.get(rnd.nextInt(sellers.size()));
            Sale sale = sales.create(planned.request(), seller.getId());
            sale.setCreatedAt(planned.at());
            if (planned.canceled()) {
                sales.cancel(sale.getId());
                sale.setCanceledAt(capAtNow(planned.at().plusMinutes(8 + rnd.nextInt(40)), now));
            }
        }

        List<PlannedService> plannedServices = planServices(rnd, now, stock);
        plannedServices.sort(Comparator.comparing(PlannedService::at));
        for (PlannedService planned : plannedServices) {
            ServiceResponse created = services.saveService(planned.request());
            ServiceOrder order = serviceRepo.findById(created.getId()).orElseThrow();
            order.setCreatedAt(planned.at());
            if (planned.status() != ServiceStatus.PENDING) {
                // Concluir baixa as peças do estoque; cancelar/executar só muda o status
                services.updateStatus(order.getId(), planned.status());
                order.setStatusChangedAt(capAtNow(planned.at().plusMinutes(20 + rnd.nextInt(160)), now));
            }
        }

        // Estoque atual de cada item: alguns abaixo do mínimo e dois zerados, para os avisos da Home aparecerem
        CATALOG.forEach(part -> stock.get(part.code()).setStock(part.stock()));
        items.saveAll(stock.values());

        return "%d itens, %d vendas e %d serviços de demonstração criados."
                .formatted(stock.size(), plannedSales.size(), plannedServices.size());
    }

    private Map<String, Item> createItems() {
        Map<String, Item> byCode = new LinkedHashMap<>();
        for (Part part : CATALOG) {
            Item item = new Item();
            item.setIdCode(part.code());
            item.setName(part.name());
            item.setBrand(part.brand());
            item.setDescription(part.description());
            item.setCostPrice(new BigDecimal(part.cost()));
            item.setSellPrice(new BigDecimal(part.price()));
            item.setStock(SIMULATION_STOCK);
            item.setMinStock(part.minStock());
            byCode.put(part.code(), items.save(item));
        }
        return byCode;
    }

    // ---------- Vendas ----------

    private List<PlannedSale> planSales(Random rnd, LocalDateTime now, Map<String, Item> stock) {
        List<PlannedSale> planned = new ArrayList<>();
        for (int daysAgo = HISTORY_DAYS; daysAgo >= 0; daysAgo--) {
            LocalDate day = now.toLocalDate().minusDays(daysAgo);
            int count = salesOn(daysAgo, day, rnd);
            for (int i = 0; i < count; i++) {
                // Uma venda cancelada em alguns dias (a terceira do dia), inclusive hoje
                boolean canceled = i == 2 && (daysAgo == 0 || daysAgo == 1 || daysAgo == 4 || daysAgo == 9 || daysAgo == 15);
                planned.add(new PlannedSale(randomTime(day, rnd, now), newSale(rnd, stock), canceled));
            }
        }
        return planned;
    }

    private int salesOn(int daysAgo, LocalDate day, Random rnd) {
        if (daysAgo == 0) return 9;
        if (daysAgo == 1) return 7;
        return switch (day.getDayOfWeek()) {
            case SATURDAY -> 2 + rnd.nextInt(3);
            case SUNDAY -> rnd.nextInt(2);
            default -> 3 + rnd.nextInt(4);
        };
    }

    private SaleRequest newSale(Random rnd, Map<String, Item> stock) {
        // 1 item em 55% das vendas, 2 em 30% e 3 em 15%
        int roll = rnd.nextInt(100);
        int lines = roll < 55 ? 1 : roll < 85 ? 2 : 3;

        Map<Part, Integer> chosen = new LinkedHashMap<>();
        while (chosen.size() < lines) {
            Part part = pickWeighted(rnd, CATALOG);
            chosen.computeIfAbsent(part, p -> 1 + rnd.nextInt(p.maxQty()));
        }

        BigDecimal subtotal = BigDecimal.ZERO;
        List<SaleRequest.SaleItemRequest> requestLines = new ArrayList<>();
        for (Map.Entry<Part, Integer> entry : chosen.entrySet()) {
            SaleRequest.SaleItemRequest line = new SaleRequest.SaleItemRequest();
            line.setItemId(stock.get(entry.getKey().code()).getId());
            line.setQuantity(entry.getValue());
            requestLines.add(line);
            subtotal = subtotal.add(new BigDecimal(entry.getKey().price()).multiply(BigDecimal.valueOf(entry.getValue())));
        }

        PaymentMethod payment = salePayment(rnd);
        SaleRequest request = new SaleRequest();
        request.setPaymentMethod(payment);
        // Parcelamento só no crédito; compra pequena sai em até 2x
        if (payment == PaymentMethod.CREDIT_CARD) {
            request.setInstallments(1 + rnd.nextInt(subtotal.compareTo(BigDecimal.valueOf(100)) >= 0 ? 6 : 2));
        }
        BigDecimal discount = BigDecimal.valueOf(2 + 3 * rnd.nextInt(3));
        request.setDiscount(rnd.nextInt(100) < 12 && discount.compareTo(subtotal) <= 0 ? discount : BigDecimal.ZERO);
        // Cliente identificado em menos da metade das vendas; o resto é venda de balcão
        if (rnd.nextInt(100) < 45) {
            request.setClientName(fullName(rnd));
            if (rnd.nextInt(100) < 60) request.setClientPhone(phone(rnd));
        }
        request.setItems(requestLines);
        return request;
    }

    private PaymentMethod salePayment(Random rnd) {
        int roll = rnd.nextInt(100);
        if (roll < 38) return PaymentMethod.PIX;
        if (roll < 63) return PaymentMethod.DEBIT_CARD;
        if (roll < 85) return PaymentMethod.CREDIT_CARD;
        return PaymentMethod.CASH;
    }

    // ---------- Serviços ----------

    private List<PlannedService> planServices(Random rnd, LocalDateTime now, Map<String, Item> stock) {
        List<PlannedService> planned = new ArrayList<>();
        int open = 0;
        for (int daysAgo = HISTORY_DAYS; daysAgo >= 0; daysAgo--) {
            LocalDate day = now.toLocalDate().minusDays(daysAgo);
            int count = servicesOn(daysAgo, day, rnd);

            List<LocalDateTime> times = new ArrayList<>();
            for (int i = 0; i < count; i++) times.add(randomTime(day, rnd, now));
            times.sort(Comparator.naturalOrder());

            for (int i = 0; i < count; i++) {
                ServiceStatus status = serviceStatus(daysAgo, i, count, rnd);
                boolean isOpen = status == ServiceStatus.PENDING || status == ServiceStatus.IN_PROGRESS;
                LocalDateTime schedule = isOpen ? nextSchedule(open++, now) : null;
                planned.add(new PlannedService(times.get(i), newService(rnd, times.get(i), status, schedule, stock), status));
            }
        }
        return planned;
    }

    private int servicesOn(int daysAgo, LocalDate day, Random rnd) {
        if (daysAgo == 0) return 8;
        if (daysAgo == 1) return 5;
        // Nos dias 2 e 3 sempre sobra algum serviço em aberto (veja serviceStatus)
        if (daysAgo <= 3) return 2 + rnd.nextInt(2);
        DayOfWeek weekday = day.getDayOfWeek();
        return switch (weekday) {
            case SATURDAY -> 1 + rnd.nextInt(2);
            case SUNDAY -> rnd.nextInt(2);
            default -> 1 + rnd.nextInt(3);
        };
    }

    // Hoje: 4 concluídos, 2 em execução e 2 aguardando. Ontem: 1 cancelado e 1 ainda em execução.
    // O último dos dias 2 e 3 segue em aberto. Antes disso: quase tudo concluído
    private ServiceStatus serviceStatus(int daysAgo, int index, int count, Random rnd) {
        boolean last = index == count - 1;
        if (daysAgo == 0) return index < 4 ? ServiceStatus.COMPLETED : index < 6 ? ServiceStatus.IN_PROGRESS : ServiceStatus.PENDING;
        if (daysAgo == 1) return last ? ServiceStatus.IN_PROGRESS : index == 2 ? ServiceStatus.CANCELED : ServiceStatus.COMPLETED;
        if (daysAgo == 2 && last) return ServiceStatus.IN_PROGRESS;
        if (daysAgo == 3 && last) return ServiceStatus.PENDING;
        return rnd.nextInt(100) < 10 ? ServiceStatus.CANCELED : ServiceStatus.COMPLETED;
    }

    private ServiceRequest newService(Random rnd, LocalDateTime at, ServiceStatus status, LocalDateTime schedule,
                                      Map<String, Item> stock) {
        Profile profile = pickProfile(rnd);
        int value = profile.minValue() + 5 * rnd.nextInt((profile.maxValue() - profile.minValue()) / 5 + 1);
        boolean onSite = rnd.nextInt(100) < profile.onSitePercent();

        ServiceRequest request = new ServiceRequest();
        request.setClientName(fullName(rnd));
        request.setClientPhone(phone(rnd));
        request.setServiceType(profile.type());
        request.setHiringDate(at.toLocalDate());
        request.setLocation(onSite ? ServiceLocation.ON_SITE : ServiceLocation.STORE);
        if (onSite) {
            request.setAddress(STREETS.get(rnd.nextInt(STREETS.size())) + ", " + (20 + rnd.nextInt(980))
                    + " - " + DISTRICTS.get(rnd.nextInt(DISTRICTS.size())));
        }
        if (rnd.nextInt(100) < 25) request.setObservations(NOTES.get(rnd.nextInt(NOTES.size())));
        request.setServiceValue(BigDecimal.valueOf(value));
        request.setScheduledAt(schedule);

        // Concluído foi pago por inteiro; em execução às vezes já tem sinal; o resto ainda não foi pago
        switch (status) {
            case COMPLETED -> {
                request.setPaidValue(BigDecimal.valueOf(value));
                request.setPaymentMethod(servicePayment(rnd));
            }
            case IN_PROGRESS -> {
                boolean deposit = rnd.nextBoolean();
                request.setPaidValue(deposit ? BigDecimal.valueOf(value / 2) : BigDecimal.ZERO);
                request.setPaymentMethod(deposit ? PaymentMethod.PIX : PaymentMethod.TO_BE_DEFINED);
            }
            default -> {
                request.setPaidValue(BigDecimal.ZERO);
                request.setPaymentMethod(PaymentMethod.TO_BE_DEFINED);
            }
        }

        if (!profile.partCodes().isEmpty()) {
            ServiceRequest.ServiceItemRequest line = new ServiceRequest.ServiceItemRequest();
            line.setItemId(stock.get(profile.partCodes().get(rnd.nextInt(profile.partCodes().size()))).getId());
            line.setQuantity(1 + rnd.nextInt(profile.maxQty()));
            request.setItems(List.of(line));
        }
        return request;
    }

    private PaymentMethod servicePayment(Random rnd) {
        int roll = rnd.nextInt(100);
        if (roll < 45) return PaymentMethod.PIX;
        if (roll < 65) return PaymentMethod.CASH;
        if (roll < 85) return PaymentMethod.DEBIT_CARD;
        return PaymentMethod.CREDIT_CARD;
    }

    // Previsão dos serviços em aberto: hoje à tarde, se ainda der tempo, ou a partir de amanhã de manhã
    private LocalDateTime nextSchedule(int order, LocalDateTime now) {
        boolean today = now.getHour() < 15;
        LocalDate day = (today ? now.toLocalDate() : now.toLocalDate().plusDays(1)).plusDays(order / 4);
        int firstHour = day.equals(now.toLocalDate()) ? now.getHour() + 1 : 9;
        return day.atTime(Math.min(firstHour + (order % 4) * 2, 17), 0);
    }

    // ---------- Sorteios e datas ----------

    private Part pickWeighted(Random rnd, List<Part> from) {
        int roll = rnd.nextInt(from.stream().mapToInt(Part::weight).sum());
        for (Part part : from) {
            roll -= part.weight();
            if (roll < 0) return part;
        }
        return from.get(0);
    }

    private Profile pickProfile(Random rnd) {
        int roll = rnd.nextInt(PROFILES.stream().mapToInt(Profile::weight).sum());
        for (Profile profile : PROFILES) {
            roll -= profile.weight();
            if (roll < 0) return profile;
        }
        return PROFILES.get(0);
    }

    // Horário comercial (8h às 18h30); hoje nunca passa de agora
    private LocalDateTime randomTime(LocalDate day, Random rnd, LocalDateTime now) {
        LocalDateTime open = day.atTime(8, 0);
        LocalDateTime close = day.atTime(18, 30);
        if (day.equals(now.toLocalDate()) && close.isAfter(now.minusMinutes(3))) {
            close = now.minusMinutes(3);
            // Semeando de manhã cedo: abre o intervalo desde a meia-noite em vez de deixá-lo vazio
            if (close.isBefore(open.plusMinutes(30))) open = day.atStartOfDay();
        }
        long span = Math.max(1, Duration.between(open, close).toMinutes());
        return open.plusMinutes(rnd.nextInt((int) span)).withSecond(rnd.nextInt(60));
    }

    private LocalDateTime capAtNow(LocalDateTime moment, LocalDateTime now) {
        LocalDateTime limit = now.minusMinutes(1);
        return moment.isAfter(limit) ? limit : moment;
    }

    private String fullName(Random rnd) {
        return FIRST_NAMES.get(rnd.nextInt(FIRST_NAMES.size())) + " " + LAST_NAMES.get(rnd.nextInt(LAST_NAMES.size()));
    }

    private String phone(Random rnd) {
        return String.format("(31) 9%04d-%04d", rnd.nextInt(10000), rnd.nextInt(10000));
    }
}
