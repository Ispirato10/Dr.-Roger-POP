export interface POPTable {
  title?: string;
  headers: string[];
  rows: string[][];
}

export interface POPImage {
  url: string;
  caption?: string;
}

export interface POPTemplate {
  id: string;
  code: string;
  title: string;
  category: string;
  objective: string;
  applicationField: string;
  definitions: string;
  siglas?: string;
  responsible: string;
  materials: string;
  epi?: string;
  riscos?: string;
  procedure: string;
  monitoring: string;
  reviewFrequency: string;
  references: string;
  version?: number;
  tables?: POPTable[];
  images?: POPImage[];
}

export const POP_TEMPLATES: POPTemplate[] = [
  {
    id: 'desinsetizacao-desratizacao',
    code: 'POP Nº 001',
    title: 'DESINSETIZAÇÃO E DESRATIZAÇÃO',
    category: 'Controle de Pragas',
    objective: 'Definir as normas aplicadas no controle de aves, insetos, roedores e outros animais na farmácia, garantindo ambiente livre de vetores e pragas.',
    applicationField: 'Toda a extensão física da farmácia (área interna e externa).',
    definitions: 'Pragas Urbanas: animais que infestam ambientes urbanos podendo causar danos à saúde ou prejuízos econômicos.',
    siglas: 'PGRSS: Plano de Gerenciamento de Resíduos de Serviços de Saúde; RDC: Resolução da Diretoria Colegiada;',
    responsible: 'Farmacêutico Responsável e Direção técnica',
    materials: 'Iscas raticidas homologadas, inseticidas químicos sancionados pela vigilância sanitária local.',
    epi: 'Avental protetor, calçado impermeável fechado.',
    riscos: 'Contaminação de produtos, prejuízo estrutural, intoxicação química residual.',
    procedure: 'I. Comunicar imediatamente ao farmacêutico responsável qualquer sinal de presença de insetos, roedores ou aves nas dependências da Drogaria (como fezes, embalagens roídas, restos de asas ou visualização direta);\nII. Periodicamente ou em caso de constatada infestação de pragas, acionar a contratação de empresa especializada devidamente homologada e licenciada perante a Vigilância Sanitária para desinsetização e desratização;\nIII. Exigir da empresa contratada a literatura técnica oficial e as fichas de segurança dos ativos químicos que serão utilizados nos serviços;\nIV. O farmacêutico deve orientar previamente todos os colaboradores sobre a instalação de iscas químicas, proibindo sua remoção ou manipulação insegura;\nV. Recomenda-se realizar a aplicação dos saneantes e desinfetantes nos finais de semana para garantir tempo hábil de ação e dispersão dos odores químicos;\nVI. Manter a periodicidade estabelecida pela legislação sanitária para reaplicações profiláticas;\nVII. Garantir controle de aves domésticas impedindo ninhos em forros, calhas e vedando aberturas estruturais;\nVIII. Registrar as operações e arquivar os canhotos no livro da qualidade para inspeções da Vigilância Sanitária.',
    monitoring: 'Vistoria periódica mensal dos locais de iscas e arquivamento dos comprovantes emitidos pela prestadora de serviço.',
    reviewFrequency: 'Anual',
    references: 'Lei Federal nº 5991 de 17 de Dezembro de 1973; RDC ANVISA nº 33 de 19 de Abril de 2000; RDC ANVISA nº 44 de 17 de Agosto de 2009.'
  },
  {
    id: 'registro-desinsetizacao',
    code: 'POP Nº 002',
    title: 'REGISTRO DE DESINSETIZAÇÃO E DESRATIZAÇÃO',
    category: 'Controle de Pragas',
    objective: 'Padronizar o registro documental de procedimentos de controle químico de vetores e pragas urbanas no estabelecimento.',
    applicationField: 'Garantia da Qualidade / Setor Administrativo.',
    definitions: 'Registro Técnico: comprovação formal por meio de planilha assinada e arquivamento de licenças do controle de pragas.',
    responsible: 'Farmacêutico Responsável',
    materials: 'Planilha de controle operacional físico ou digital, arquivo de laudos.',
    epi: 'Avental branco padrão.',
    procedure: 'I. Concluída a atividade de desinsetização/desratização na drogaria, o farmacêutico deve providenciar imediatamente o registro em planilha específica interna;\nII. Preencher de forma legível sem rasuras as informações de data de aplicação, empresa prestadora, responsável técnico, ativos químicos aplicados e prazo de validade;\nIII. Afixar em local visível à fiscalização o comprovante oficial ou certificado de execução do serviço fornecido pela empresa registrada.',
    monitoring: 'Conferência visual mensal da vigência do certificado afixado e integridade das assinaturas na planilha técnica.',
    reviewFrequency: 'Anual',
    references: 'Lei Federal nº 5991 de 17 de Dezembro de 1973; RDC ANVISA nº 33 de 2000; RDC ANVISA nº 44 de 2009.'
  },
  {
    id: 'limpeza-caixa-agua',
    code: 'POP Nº 003',
    title: 'LIMPEZA DA CAIXA D\'ÁGUA',
    category: 'Higiene e Sanitização',
    objective: 'Assegurar que o reservatório de água potável esteja isento de sujidades, agentes patogênicos ou biofilmes nocivos, resguardando a potabilidade da água para uso.',
    applicationField: 'Caixa d\'água principal e dependências hidráulicas.',
    definitions: 'Sanitização: eliminação sistemática de microrganismos patogênicos por meio de agentes físicos ou sanitizantes químicos apropriados.',
    responsible: 'Administração da Farmácia e Farmacêutico Responsável',
    materials: 'Saneantes licenciados, planilha de registro técnico.',
    riscos: 'Controle de contaminação bacteriana (ex: coliformes e salmonela) ou deposição de lodo sedimentar.',
    procedure: 'Periodicidade do Procedimento:\n- Quando o reservatório apresentar sujidade visual ou lodo sedimentar;\n- Em situações de suspeita médica ou comprovação técnica de poluição imediata da água;\n- Caso ocorra penetração indelével de objetos, aves ou animais no poço de captação;\n- Preventivamente de forma periódica em intervalos regulares não superiores a 6 (seis) meses.\n\nProcedimento Executivo:\nI. Manter a caixa d\'água permanentemente tampada de forma estanque, impedindo abrigo ou repouso de fauna sinantrópica;\nII. Contratar e agendar a lavagem e sanitização da parede interna por meio de empresa terceirizada devidamente habilitada pela autoridade técnica competente;\nIII. Proceder ao registro em planilha específica após o término, registrando a data e o laudo de potabilidade.',
    monitoring: 'Auditoria de cronograma hidráulico sistemático semestral e arquivo de exames bacteriológicos.',
    reviewFrequency: 'Anual',
    references: 'RDC ANVISA nº 44 de 17 de Agosto de 2009; Portarias do Ministério da Saúde.'
  },
  {
    id: 'registro-limpeza-caixa',
    code: 'POP Nº 004',
    title: 'REGISTRO DE LIMPEZA DE CAIXA D\'ÁGUA',
    category: 'Higiene e Sanitização',
    objective: 'Instaurar metodologia de controle técnico de arquivamento administrativo para os processos de desinfecção hídrica periódica.',
    applicationField: 'Garantia da Qualidade / Escritório Administrativo.',
    definitions: 'Laudo de Potabilidade: análise de conformidades físico-químicas e microbiológicas da Amostra da água.',
    responsible: 'Administração e Farmacêutico Coordenador',
    materials: 'Pasta de registro da drogaria, planilha de assinaturas hídricas.',
    procedure: 'I. Imediatamente após a finalização da desinfecção e lavagem da caixa d\'água, preencher a planilha de registro de limpeza de caixa d\'água;\nII. Informar as datas cronológicas do serviço, nome da empresa executora registrada, prazo legal de vencimento da próxima limpeza preventiva;\nIII. Arquivar a via física do laudo técnico emitido de potabilidade por período determinado na legislação.',
    monitoring: 'Verificação em auditoria semestral sobre a presença de planilhas correspondentes e laudos na pasta técnica.',
    reviewFrequency: 'Anual',
    references: 'Lei Federal nº 5991 de 17 de Dezembro de 1973; Recomendações sanitárias locais.'
  },
  {
    id: 'limpeza-sala-servicos',
    code: 'POP Nº 005',
    title: 'LIMPEZA DA SALA DE SERVIÇOS FARMACÊUTICOS',
    category: 'Higiene e Sanitização',
    objective: 'Eliminar sistematicamente microrganismos patogênicos e resíduos orgânicos ou sintéticos da sala de procedimentos clínicos.',
    applicationField: 'Sala de serviços farmacêuticos (gerenciada técnica).',
    definitions: 'Assepsia: conjunto de medidas adotadas para impedir a introdução de germes ou contaminações em meios estéreis.',
    responsible: 'Pessoal responsável pela higienização, Farmacêutico e Colaboradores em geral',
    materials: 'Hipoclorito de sódio a 1%, álcool etílico a 70% p/p, toalhas de papel absorvente, água potável, sabão líquido neutro.',
    epi: 'Luvas de proteção robustas, avental de manga longa.',
    riscos: 'Contaminações cruzadas, exposição a fluidos corporais infectantes (sangue), acidentes biológicos.',
    procedure: 'I. Executar este procedimento de assepsia ambiental no início e ao término de cada jornada de funcionamento da drogaria;\nII. Fazer a lavagem física do assoalho com água, sabão neutro e solução ativa de hipoclorito de sódio diluído a 1%;\nIII. Limpar e realizar fricção mecânica rigorosa por no mínimo 30 (trinta) segundos sobre as superfícies de bancadas, braçadeiras de aplicação, suportes de punção, pia e mobiliário com álcool a 70% p/p;\nIV. Retirar periodicamente os recipientes e materiais perfurocortantes (Descarpack) antes que atinjam o limite estipulado, acondicionando-os de forma hermética rígida conforme normas sanitárias específicas;\nV. Higienizar e sanitizar com álcool a 70% as bancadas clínicas logo após a finalização de cada serviço clínico individual realizado;\nVI. Certificar logo após o atendimento de cada cliente se há necessidade de assepsia complementar para mitigar riscos biológicos de transmissão de doenças;\nVII. Assinar a planilha correspondente de higienização de serviços farmacêuticos.',
    monitoring: 'Assinatura em ficha de verificação diária e controle sensorial efetuado pelo farmacêutico.',
    reviewFrequency: 'Anual',
    references: 'Lei Federal nº 5991 de 17 de Dezembro de 1973; RDC ANVISA nº 33 de 19 de Abril de 2000; RDC ANVISA nº 44 de 17 de Agosto de 2009.'
  },
  {
    id: 'limpeza-todos-ambientes',
    code: 'POP Nº 006',
    title: 'LIMPEZA DE TODOS AMBIENTES DA FARMÁCIA',
    category: 'Higiene e Sanitização',
    objective: 'Manter a salubridade, ordem e higienização de todas as unidades comuns da drogaria, preservando os medicamentos de sujidades ou agentes contaminantes.',
    applicationField: 'Área comum de circulação, sanitários, copa e balcões da farmácia.',
    definitions: 'Rotina de Higienização: divisão do cronograma operacional de lavagens por periodicidades estabelecidas.',
    responsible: 'Pessoal responsável pela higienização sob inspeção técnica',
    materials: 'Água hídrica, hipoclorito de sódio a 1%, detergente líquido neutro, panos de higienização, desinfetante ativo.',
    epi: 'Avental clínico, luvas duráveis de borracha para limpeza pesada.',
    procedure: 'HIGIENIZAÇÃO DO AMBIENTE (ÁREA COMUM EM GERAL):\nRotinas Diárias:\nI. Efetuar o recolhimento e esvaziamento de cestos coletores de lixo comum ao menos duas vezes ao dia ou sempre que necessário;\nII. Enquadrar e armazenar adequadamente o lixo coletado comum no setor de resíduos comuns (Grupo D);\nIII. Fazer a lavagem do piso da farmácia diariamente antes da abertura e ao final do expediente com água, sabão neutro e hipoclorito de sódio a 1% para assepsia bactericida;\nIV. Passar pano úmido hídrico com álcool sobre balcões dispensadores, vidros e espelhos comuns;\nV. Avaliar e remover telhas de aranha ou fuligens visíveis no teto.\n\nRotinas Semanais:\nI. Efetuar a limpeza de janelas e esquadrias com detergente líquido neutro;\nII. Lavar e desinfetar todas as portas sociais e administrativas;\nIII. Limpar prateleiras internas, displays e superfícies de produtos retirando poeiras com pano macio levemente umedecido.\n\nHIGIENIZAÇÃO DO BANHEIRO (DIÁRIA):\nI. Coletar os cestos sanitários de lixo duas vezes ao dia;\nII. Armazenar lixo de banheiro no depósito geral do Grupo D;\nIII. Inspecionar e repor toalhas de papel, papel higiênico e sabonetes líquidos;\nIV. Fazer a lavagem minuciosa dos vasos sanitários e pias com água sanitária ativa (hipoclorito com sabão de 1% a 2%) de forma recorrente.',
    monitoring: 'Planilha de assinaturas operacionais diárias fixada nas portas das unidades higienizadas.',
    reviewFrequency: 'Anual',
    references: 'Lei Federal 5991/73; RDC ANVISA nº 33 de 2000; RDC ANVISA nº 44 de 2009.'
  },
  {
    id: 'aquisicao-produtos',
    code: 'POP Nº 007',
    title: 'AQUISIÇÃO DE PRODUTOS',
    category: 'Logística Farmacêutica',
    objective: 'Padronizar as atividades comerciais de compras e qualificação das indústrias e distribuidoras farmacêuticas.',
    applicationField: 'Setor de compras, administração e gerência.',
    definitions: 'Regularidade Sanitária: presença de registro regulamentar vigente de medicamentos ou produtos para saúde sob ANVISA.',
    responsible: 'Comprador técnico, Gerência Comercial e Farmacêutico',
    materials: 'Sistema ERP de dados, arquivos de licenças sanitárias de terceiros.',
    procedure: 'I. Adquirir produtos e medicamentos única e exclusivamente regularizados junto à ANVISA, verificando notificações, cadastros e registros vigentes;\nII. Comprar produtos apenas de distribuidores e indústrias devidamente autorizadas perante vigilância local, portando AFE (Autorização de Funcionamento de Empresa);\nIII. Efetuar o procedimento formal de qualificação de fornecedores baseando-se em:\n1) Histórico de confiabilidade comercial no mercado;\n2) Se pertinente, realizar visitas presenciais às distribuidoras para vistorias físicas;\n3) Percentual reduzido de rechaço ou devoluções qualitativas;\n4) Pontualidade na data logística acordada;\n5) Fornecimento de laudos analíticos originais;\n6) Adequabilidade das embalagens no momento da entrega de lotes logísticos;\n7) Valores compatíveis comerciais (valores muito baixos acendem alertas de pirataria);\n8) Documentar e compor a ficha cadastral única de cada parceiro comercial em arquivo físico do sistema.',
    monitoring: 'Inspeções formais trimestrais sobre as autorizações AFE dos fornecedores da base cadastral.',
    reviewFrequency: 'Anual',
    references: 'RDC ANVISA nº 44 de 17 de Agosto de 2009; Diretrizes de Qualificação de Fornecedores.'
  },
  {
    id: 'recebimento-produtos',
    code: 'POP Nº 008',
    title: 'RECEBIMENTO DE PRODUTOS',
    category: 'Logística Farmacêutica',
    objective: 'Proceder à criteriosa conferência administrativa e técnica das mercadorias adquiridas pela farmácia no ato de descarga do fornecedor.',
    applicationField: 'Doca ou setor específico para recebimento temporário de cargas.',
    definitions: 'Conferência de Lote: verificação de convergência entre os dados literais da Nota Fiscal (NF) e o produto físico entregue.',
    responsible: 'Farmacêutico Responsável, Administradores e Repositores de Carga',
    materials: 'Notas Fiscais de compra, leitores de código, canetas, formulário de devolução comercial.',
    procedure: 'I. Descarregar os materiais do transportador restritamente no setor isolado designado a receber produtos;\nII. Iniciar a conferência de lote avaliando razão social, número de série de NF, e discriminação dos volumes;\nIII. Bater e consolidar quantitativamente os volumes recebidos contra o pedido de compra original do sistema;\nIV. Fazer inspeção visual nos itens, atentando-se para:\n1) Integridade visual de embalagens externas (devem estar limpas, livres de umidade ou rasgos);\n2) Presença indubitável de lacres de segurança invioláveis em caixas coletivas;\n3) Legibilidade das marcações de lotes e validade nas cartelas e frascos;\n4) Validação expressa se os lotes contidos nos frascos coincidem com a NF física;\n5) Vencimento mínimo (MIPs e medicamentos com vencimento menor de 6 meses devem ser rechaçados ou devolvidos no ato);\nV. Quando houver suspeitas ou indícios de falsificações, alterações qualitativas ou amostras corrompidas, isolar os produtos fisicamente na área vermelha de quarentena. Notificar imediatamente a vigilância sanitária local e registrar o ocorrido.',
    monitoring: 'Assinatura técnica do farmacêutico no canhoto receptivo da NF comprovando recebimento idôneo.',
    reviewFrequency: 'Anual',
    references: 'RDC ANVISA nº 44 de 17 de Agosto de 2009; Procedimentos Logísticos de Recepção GERAL.'
  },
  {
    id: 'armazenamento-produtos',
    code: 'POP Nº 009',
    title: 'ARMAZENAMENTO DE PRODUTOS',
    category: 'Logística Farmacêutica',
    objective: 'Preservar as qualidades físico-químicas, esterilidades e propriedades terapêuticas dos produtos mediante seu correto posicionamento e guarda espacial.',
    applicationField: 'Prateleiras, armários fechados, paletes e refrigeradores de conservação.',
    definitions: 'PEPS (Primeiro que Expira, Primeiro que Sai): metodologia logística onde itens com menor prazo de validade devem ser expostos na frente.',
    responsible: 'Repositores, Farmacêuticos Clínicos, Gestor de Almoxarifado',
    materials: 'Prateleiras metálicas laváveis, termômetro digital Incoterm calibrado.',
    procedure: 'I. Posicionar os medicamentos ordenadamente sobre prateleiras ou displays adequados, nunca em contato direto com o solo;\nII. Implementar categoricamente o fluxo logístico PEPS. Organizar displays de tal sorte que medicamentos com vencimento imediato fiquem acessíveis de imediato;\nIII. Medicamentos termolábeis requerem guarda imediata em geladeiras térmicas monitoradas recomendadas por laboratório (2ºC a 8ºC), mitigando radiação solar ou aquecimento térmico;\nIV. A geladeira de termolábeis farmacêuticos é de utilização estrita para medicamentos, sendo proibida alimentação humana ou itens não licenciados em seu interior;\nV. Manter displays, racks e prateleiras higienizadas sem acúmulo de poeiras comuns;\nVI. Produtos avariados, danificados ou vencidos devem ser transferidos ao setor amarelo de descarte/segregação;\nVII. Inspecionar rotineiramente datas e cronogramas de validade mensalmente;\nVIII. Armazenar medicamentos afastados de focos de umidade ou calor radiante direto;\nIX. Fornecer espaçamento mínimo contra paredes laterais ao solo (distâncias de 10cm no assoalho e 10cm teto/paredes);\nX. Manter ampolas, vidrarias ou pomadas vulneráveis em caixas ou gaveteiros amortecidos.',
    monitoring: 'Controle diário do termo-higrômetro na sala principal e geladeiras térmicas.',
    reviewFrequency: 'Anual',
    references: 'Lei Federal 5991/73; RDC ANVISA nº 44 de 2009; Manual Técnico Incoterm.'
  },
  {
    id: 'validade-proxima-vencimento',
    code: 'POP Nº 010',
    title: 'PRODUTOS COM VALIDADE PRÓXIMA AO VENCIMENTO',
    category: 'Logística Farmacêutica',
    objective: 'Determinar rotinas de monitoramente físico de estoques para mitigar comercializações indevidas de medicamentos vencidos.',
    applicationField: 'Todo o estoque físico do balcão e retaguardas da drogaria.',
    definitions: 'Controle de Validades Próximas: produtos que restam menos de 6 meses da data limite impressa.',
    responsible: 'Repositores de Balcão e Farmacêuticos Responsáveis',
    materials: 'Formulários mensais de controle de prateleiras, etiquetas impressas chamativas.',
    procedure: 'I. Executar mensalmente e sem exceções o controle minucioso e físico do estoque conforme escala setorial por funcionário;\nII. Identificar e rotular de forma proeminente todos os itens com vencimento igual ou inferior a 6 meses. Mover se possível para a prateleira interna de saldos rápidos com preços facilitados;\nIII. Coletar os itens de auto-serviço ou balcão clínico que alcancem margem final de utilidade (vencimentos menores que 30 dias). Retirá-los da venda física e encaminhar ao almoxarifado de quarentena;\nIV. No ato de entrada de novos produtos da doca distribuidora, recusar sumariamente prazos de vencimento menores que as margens operacionais estipuladas no contrato comercial;\nV. Devolver ao laboratório ou distribuidora responsável itens cuja data útil residual impossibilite consumo integral seguro.',
    monitoring: 'Conferência física amostral quinzenal do estoque operacional e auditoria técnica de relatórios do sistema.',
    reviewFrequency: 'Anual',
    references: 'Lei Federal 5991/73; RDC ANVISA nº 44 de 17 de Agosto de 2009.'
  },
  {
    id: 'produtos-vencidos',
    code: 'POP Nº 011',
    title: 'PRODUTOS VENCIDOS',
    category: 'Logística Farmacêutica',
    objective: 'Garantir que medicamentos sem vida útil de eficácia clínica sofram segregação e disposição final legal e segura.',
    applicationField: 'Sala vermelha de quarentena ou prateleira de inservíveis.',
    definitions: 'Resíduo Químico Perigoso (Grupo B): resíduos contendo princípios ativos terapêuticos perigosos.',
    responsible: 'Farmacêutico Responsável de Plantão',
    materials: 'Caixas de papelão e sacos apropriados para as marcas de descarte, etiquetas vermelhas.',
    procedure: 'I. Coletar os medicamentos vencidos do balcão clínico, segregá-los e rotulá-los visivelmente com o aviso "PRODUTO EXCLUSIVO PARA DESCARTE CORRETO";\nII. Quando operado em devolução comercial, emitir respectiva Nota Fiscal de Devolução identificando as avarias técnicas para destinação junto ao PGRSS da indústria;\nIII. Em caso negativo de frete de devolução, transferir o montante vencido ao setor isolado de classificação técnica PGRSS e enquadrar no Grupo B de perigos químicos.',
    monitoring: 'Auditoria de pesagem pelo Responsável Técnico e arquivo dos manifestos do PGRSS.',
    reviewFrequency: 'Anual',
    references: 'Resolução ANVISA RDC nº 306/2004; RDC 44/2009.'
  },
  {
    id: 'dispensacao-medicamentos',
    code: 'POP Nº 012',
    title: 'DISPENSAÇÃO DE MEDICAMENTOS',
    category: 'Farmácia Clínica',
    objective: 'Estabelecer os procedimentos detalhados e integrados para a correta dispensação de medicamentos, promovendo o uso racional e garantindo a segurança do paciente.',
    applicationField: 'Setor de atendimento, recepção e balcão de dispensação da Farmácia UBS Central / Unidades de Saúde.',
    definitions: 'Dispensação: ato clínico farmacêutico de fornecer um ou mais medicamentos a um paciente, geralmente respondendo à apresentação de uma receita médica. Envolve a análise técnica da legalidade da prescrição, indicação terapêutica, posologia e orientação qualificada sobre o uso racional, reações adversas, conservação e interações químicas.',
    siglas: 'UBS: Unidade Básica de Saúde; SNGPC: Sistema Nacional de Gerenciamento de Produtos Controlados; ANVISA: Agência Nacional de Vigilância Sanitária; CRM: Conselho Regional de Medicina; CRO: Conselho Regional de Odontologia; SUS: Sistema Único de Saúde; RDC: Resolução da Diretoria Colegiada.',
    responsible: 'Farmacêutico Responsável Técnico e todos os funcionários atuantes na dispensação da farmácia.',
    materials: 'Caneta azul ou preta, carimbo profissional do farmacêutico, receituário de controle especial, listas oficiais de intercambialidade de genéricos da ANVISA, livros de registro manual de dispensação de isentos (MIPs).',
    epi: 'Avental branco padrão de manga longa, máscara facial descartável e luvas de procedimentos descartáveis (se necessário).',
    riscos: 'Erros graves de dosagem, dispensação trocada de medicamentos, reações alérgicas agudas, não conformidades legais sanitárias nas notificações retidas.',
    procedure: '3.1. PROCEDIMENTO ESPECÍFICO PARA ATENDIMENTO DE MEDICAMENTOS SUJEITOS À PRESCRIÇÃO MÉDICA\n\na) Dispensar medicamentos sujeitos à prescrição médica somente mediante a apresentação da receita original correspondente.\nb) Verificar se a prescrição foi efetuada por profissional devidamente habilitado e autorizado (médico ou dentista).\nc) Orientar o paciente quanto à:\n  - Posologia correta do tratamento;\n  - Horários de tomada estipulados;\n  - Via de administração adequada;\n  - Duração de tratamento completa;\n  - Modo correto de preparo (quando couber);\n  - Influência de alimentos no uso do medicamento;\n  - Possíveis interações com outros medicamentos em uso;\n  - Reações adversas potenciais e procedimentos de segurança;\n  - Condições ideias de conservação do produto no ambiente doméstico.\nd) Solicitar obrigatoriamente que o farmacêutico avalie a receita técnica quanto a:\n  - Legibilidade completa e total ausência de rasuras de qualquer tipo;\n  - Completa identificação do usuário;\n  - Identificação clara do medicamento, concentração, dosagem, forma farmacêutica e quantidade total;\n  - Modo de usar e duração de tratamento;\n  - Local, data de emissão e assinatura do prescritor com registro respectivo do Conselho Profissional (CRM/CRO).\ne) Contatar imediatamente o prescritor caso haja qualquer dúvida técnica sobre o tratamento.\nf) Não dispensar em hipótese alguma medicamentos cujas receitas estejam ilegíveis ou rasuradas.\ng) Verificar rigidamente a data de validade de cada medicamento no momento exato da entrega ao usuário.\nb) Alertar prestativamente o usuário quando o produto tiver prazo de validade próximo ao vencimento.\ni) Orientar o cliente em linguagem clara, simples e objetiva, certificando-se de que ele realmente compreendeu as instruções de uso correto.\n\n3.2. PROCEDIMENTO GERAL PARA DISPENSAÇÃO DE MEDICAMENTOS DA PORTARIA 344/98 (CONTROLADOS)\n\na) Conferir minuciosamente todos os campos da receita ou notificação de receita antes de qualquer entrega.\nb) Verificar se todos os campos estão preenchidos corretamente, de forma legível, sem emendas, rasuras ou borrões.\nc) Verificar detalhadamente a identificação do emitente:\n  - Nome do profissional, número de inscrição no Conselho Regional com a respectiva UF, endereço completo ou nome do estabelecimento de saúde institucional;\n  - Validar se a receita tem a assinatura original obrigatória do prescritor.\nd) Preencher obrigatoriamente todos os campos da Identificação do Comprador com dados legíveis e completos. Caso não haja este campo disponível na Receita (como no caso de notificações especiais), deve-se preencher de próprio punho todos estes dados identificadores no verso da própria receita.\n\n3.3. PROCEDIMENTO ESPECÍFICO PARA ATENDIMENTO DE NOTIFICAÇÃO DE RECEITA “A”\n\na) A Notificação de Receita “A” é utilizada para a prescrição de substâncias pertencentes às LISTAS A1 e A2 (Entorpecentes) e A3 (Psicotrópicos). Sua cor obrigatória e exclusiva é AMARELA.\nb) Esta notificação específica possui validade legal de no máximo 30 dias após sua emissão pelo profissional.\nc) Pode ser prescrito apenas um medicamento por cada notificação de receita individual, observando o limite máximo de 5 ampolas para formas injetáveis.\nd) A quantidade dispensada final deve atender ao período de tratamento estrito de até 30 dias, conforme a posologia estipulada.\n\n3.4. PROCEDIMENTO ESPECÍFICO PARA ATENDIMENTO DE NOTIFICAÇÃO DE RECEITA “B1”\n\na) A Notificação de Receita “B” (B1) é utilizada para a prescrição de substâncias pertencentes à Lista B1 (Portaria 344/98). Sua cor padrão obrigatória é AZUL.\nb) É válida somente no estado da federação onde foi efetivamente emitida, exigindo receita complementar de justificativa caso emitida em outra UF.\nc) Possui prazo de validade improrrogável de até 30 dias corridos após sua emissão oficial.\nd) Pode conter a prescrição de apenas uma substância ou um tipo de medicamento por cada folha de receita.\ne) A quantidade máxima de dispensação autorizada deve atender ao período de tratamento de até 60 dias, conforme posologia.\n\n3.5. PROCEDIMENTO ESPECÍFICO PARA ATENDIMENTO DE MEDICAMENTOS ANTIMICROBIANOS (ANTIBIÓTICOS)\n\na) Dispensar medicamentos antimicrobianos exclusivamente mediante a apresentação, validação e retenção obrigatória da receita de controle especial em duas vias.\nb) O processo exige que a 1ª via seja retida fisicamente no estabelecimento farmacêutico e a 2ª via seja devidamente carimbada/atestada e devolvida ao paciente como comprovante.\nc) Verificar se a prescrição foi efetuada por médico ou dentista legalmente habilitado em receituário privativo do profissional ou institucional, não havendo modelo padronizado único.\nd) Prestar orientação esclarecedora ao paciente sobre a importância da conclusão de todo o ciclo do tratamento (para evitar resistência bacteriana), posologia, reações adversas e conservação.\ne) Solicitar que o farmacêutico avalie detalhadamente a receita quanto a legibilidade e validade.\nf) As receitas de antimicrobianos possuem validade máxima de 10 (dez) dias corridos e improrrogáveis a contar do dia seguinte ao da sua emissão. Exceção: receitas contendo indicação expressa de TRATAMENTO CONTÍNUO, sendo válidas para aquisições periódicas de até 90 dias com dispensações de no máximo 30 dias por vez.\ng) A mesma receita de antimicrobiano poderá conter a prescrição de outros tipos de medicamentos comuns, desde que não sujeitos ao controle de outras portarias especiais.\nh) Recusar veementemente a venda se houver ilegibilidade, rasuras ou preenchimento incorreto de dados.\ni) Verificar as datas de validade das embalagens físicas dos antibióticos e orientar detalhadamente sobre prazos.\nj) Não dispensar quando a posologia recomendada não puder ser completada dentro do prazo de validade do produto.\nk) Preencher no verso ou campo próprio os dados de Identificação do Comprador correspondentes.\n\n3.6. PROCEDIMENTO ESPECÍFICO PARA ATENDIMENTO DE MEDICAMENTOS ISENTOS DE RECEITA MÉDICA (MIPs)\n\na) Obter informações gerais completas e fidedignas sobre o paciente no momento do atendimento no balcão de vendas:\n  - Sintomas que ele está sentindo e há quanto tempo;\n  - Se é a primeira vez que isto acontece, se não, quais os medicamentos que já usou;\n  - Estado geral de saúde (aspectos físicos, emocionais e mentais);\n  - Hábitos alimentares gerais e possíveis condições ou patologias crônicas diagnosticadas.\nSe o caso sugerir suspeita de patologia grave ou complexa, ou reações sistêmicas atípicas, suspender quaisquer indicações temporárias e encaminhar imediatamente o paciente ao profissional médico especializado.\nb) Dispensar medicamentos sem prescrição apenas nos casos de patologias menores, autolimitadas ou para o alívio provisório imediato de sintomas pontuais até a consulta médica.\nc) Informar ao paciente de forma clara, simples e concisa a via de administração, posologia correta, duração máxima de uso contínuo seguro, possíveis interações químicas e contraindicações.\nd) Orientar de forma clara o paciente a recorrer ao pronto atendimento ou médico se os sintomas persistirem por mais de 3 dias ou se agravarem em qualquer período.\ne) Medicamentos isentos de prescrição médica dispensáveis nas unidades da rede UBS:\n  1. Dipirona gotas e comprimidos;\n  2. Paracetamol gotas e comprimidos;\n  3. Simeticona gotas;\n  4. Nistatina + óxido de zinco pomada (assaduras);\n  5. Sais de reidratação oral;\n  6. Ibuprofeno gotas e comprimidos (300mg).\nf) Registrar obrigatoriamente toda dispensação de medicamentos isentos de receita na lista ou ficha de registro específica \"Dispensação de medicamentos isentos de receita médica\", contendo legivelmente o nome do paciente, medicamento e quantidade de caixas/frascos.',
    monitoring: 'Inspeção diária sistemática do preenchimento das notificações de receitas retidas, conciliação e batimento com as saídas físicas, e auditoria mensal de receitas arquivadas.',
    reviewFrequency: 'Anual (a cada 12 meses) ou imediatamente se houver alterações nas diretrizes da Vigilância Sanitária ou RDCs da ANVISA vigentes.',
    references: 'Lei Federal nº 9.787/99; RDC ANVISA nº 44/2009 (Boas Práticas Farmacêuticas); RDC ANVISA nº 20/2011 (Antimicrobianos); Portaria Ministério da Saúde SVS nº 344/98 e atualizações; Conselho Federal de Farmácia (CFF) - Como Montar uma Farmácia Comunitária, 2001.',
    tables: [
      {
        title: "CADASTRO DE USUÁRIOS DE REMÉDIOS CONTROLADOS",
        headers: ["Campo no Verso ou Notificação", "Informação Obrigatória a Preencher"],
        rows: [
          ["NOME COMPLETO", "Nome completo por extenso do comprador do medicamento"],
          ["DATA NASCIMENTO", "Data de nascimento do comprador (DD/MM/AAAA)"],
          ["DOCUMENTO RG", "Registro Geral oficial com órgão emissor e UF"],
          ["CARTÃO SUS", "Número do Cartão Nacional de Saúde do comprador ou paciente"],
          ["ENDEREÇO COMPLETO", "Endereço de residência atualizado com logradouro, número, ap/bloco"],
          ["CIDADE / ESTADO", "Cidade de domicílio correspondente com UF"]
        ]
      },
      {
        title: "ENTREGA E IDENTIFICAÇÃO EM ANTIMICROBIANOS (VERSO DA RECEITA)",
        headers: ["Campo de Identificação", "Informação Obrigatória para Registro"],
        rows: [
          ["NOME DO COMPRADOR", "Nome completo do responsável pela retirada do antibiótico"],
          ["DOCUMENTO RG", "Número do documento de identidade de quem está retirando"],
          ["ENDEREÇO COMPLETO", "Residência habitual e fidedigna"],
          ["CIDADE", "Cidade de residência com UF"]
        ]
      }
    ],
    images: [
      {
        url: "/notificacao_receita_a.svg",
        caption: "Ilustração 1: Layout e campos obrigatórios da Notificação de Receita 'A' (Amarela) para entorpecentes e psicotrópicos."
      },
      {
        url: "/notificacao_receita_b.svg",
        caption: "Ilustração 2: Layout e campos obrigatórios da Notificação de Receita 'B' (Azul) para psicotrópicos de uso controlado."
      }
    ]
  },
  {
    id: 'controle-temperatura-umidade',
    code: 'POP Nº 013',
    title: 'CONTROLE DE TEMPERATURA E UMIDADE',
    category: 'Logística Farmacêutica',
    objective: 'Zelar pelas condições climáticas de estocagem molecular dos fármacos mantendo-os longe de alterações químicas causadas por temperatura e umidade inadequadas.',
    applicationField: 'Gôndolas em geral, dispensário de fitoterápicos, área clínica.',
    definitions: 'Termo-higrômetro: dispositivo médico-metrológico calibrado para medição de calor térmico e vapores úmidos no ambiente.',
    responsible: 'Toda a equipe de colaboradores e Responsável Técnico de Plantão',
    materials: 'Aparelho termo-higrômetro Incoterm Anvisa, planilhas de monitoramento térmico diárias.',
    procedure: 'I. Utilizar termo-higrômetro digital devidamente calibrado pelo fornecedor oficial no momento inicial de montagem;\nII. Medir e monitorar duas vezes ao dia as variações do painel climático. Períodos críticos obrigatórios são entre 10h e 11h e entre 14h e 15h, por representarem maior sensibilidade climática;\nIII. Anotar todos os dados na planilha oficial mantendo visivelmente a meta ideal de temperatura de ambiente estipulada (15ºC a 30ºC) e controle ideal de umidade de ambientes;\nIV. Caso as variações térmicas ultrapassem as marcas ideais estipuladas, acionar climatizadores ou aparelhos de ar-condicionado para readaptação térmica imediata.',
    monitoring: 'Inspeção diária do preenchimento da planilha pelo Responsável Técnico em turnos de supervisão.',
    reviewFrequency: 'Anual',
    references: 'RDC ANVISA nº 44 de 17 de Agosto de 2009; Manuais Internos de Calibração.'
  },
  {
    id: 'aplicacao-injetaveis',
    code: 'POP Nº 014',
    title: 'APLICAÇÃO DE INJETÁVEIS',
    category: 'Serviços Farmacêuticos',
    objective: 'Padronizar técnicas de injeções parenterais intramusculares ou subcutâneas, mitigando contaminações cruzadas e acidentes com agulhas.',
    applicationField: 'Sala reservada e de assepsia higiênica para aplicação de injetáveis.',
    definitions: 'Administração Parenteral: introdução do ativo terapêutico no organismo por vias injetáveis diretas na fibra muscular.',
    responsible: 'Farmacêuticos habilitados pelo conselho regional ou injetores devidamente registrados',
    materials: 'Prescrição médica carimbada, ampolas de medicamentos, seringas e agulhas descartáveis estéreis, álcool a 70%, algodão de assepsia.',
    epi: 'Avental manga longa de proteção, luvas cirúrgicas de látex descartável.',
    riscos: 'Acidente pérfuro-cortante biológico direto, abcessos assépticos no tecido por falhas de lavagem.',
    procedure: 'I. Avaliar minuciosamente a receita médica carimbada verificando lote de dosagem, datas operacionais, vias e assinatura técnica;\nII. Fazer a triagem do paciente, encaminhando-o à sala apropriada de injeção e posicionando-o de maneira confortável;\nIII. Confirmar que m. glúteo maior comporta doses de no máximo 5ml de solução medicamentosa ativa, enquanto braço comporta no máximo 3ml clínicos;\nIV. Proibir expressamente injeção intramuscular no braço de ativos sabidamente irritantes teciduais como diclofenaco, ferrosos ou repositores hormonais com suspensão precipitada;\nV. Lavar rigorosamente as mãos com sabonete antisséptico e cobrir com álcool gel a 70%, deixando o produto evaporar naturalmente;\nVI. Abrir os insumos terapêuticos descartáveis na presença do cliente, atestando lote e esterilidades;\nVII. Desinfectar os gargalos de vidros e ampolas com solução mecânica de álcool, aspirar a dosagem contida e expulsar as bolhas de ar;\nVIII. Passar algodão estéril saturado com solução higienizadora de álcool sobre a derme muscular em sentido circular único;\nIX. Introduzir a agulha no ângulo correspondente à via IM, aspirar o êmbolo (testando segurança vascular) e injetar lentamente o fluido;\nX. Extrair a agulha aplicando pressão física suave com algodão limpo e orientando observação física;\nXI. Descartar as agulhas usadas e seringas no coletor amarelo protetor rígido Descarpack; panos corporais e ampolas de sangue seguem ao lixo biológico.',
    monitoring: 'Estatísticas mensais de ocorrências registradas em livro de declaração de serviços farmacêuticos.',
    reviewFrequency: 'Anual',
    references: 'RDC ANVISA nº 44 de 17 de Agosto de 2009; Técnicas Parenterais de Referência.',
    tables: [
      {
        title: "DIRETRIZES DE SELEÇÃO DE AGULHAS POR PERFIL CLÍNICO",
        headers: ["Perfil do Paciente", "Agulha IM Sugerida (Glúteo)", "Agulha IM Sugerida (Deltoide)"],
        rows: [
          ["Adulto de Baixo Peso / Magro", "25 x 7 ou 30 x 7", "20 x 7"],
          ["Adulto de Peso Normal", "30 x 7", "25 x 7"],
          ["Adulto com Obesidade", "30 x 8 ou 40 x 8", "30 x 7"],
          ["Criança em Desenvolvimento", "25 x 7 ou 25 x 8", "20 x 5.5"],
          ["Criança com Obesidade", "30 x 7", "25 x 7"],
          ["Crianças Pequenas / Lactentes", "20 x 5.5", "Não Recomendado"],
          ["Vias Especiais / Glúteo Regular", "30 x 7 ou 30 x 8", "20 x 5.5 ou Escalpe"]
        ]
      }
    ]
  },
  {
    id: 'afericao-pressao-arterial',
    code: 'POP Nº 015',
    title: 'AFERIÇÃO DE PRESSÃO ARTERIAL',
    category: 'Serviços Farmacêuticos',
    objective: 'Metodizar a avaliação não invasiva da hemodinâmica arterial utilizando manguitos e aparelhos pressóricos eletrônicos homologados.',
    applicationField: 'Sala de serviços e consultas farmacêuticas da drogaria.',
    definitions: 'Pressão Arterial (PA): pressão que a corrente sanguínea exerce contra os vasos e canais arteriais mecânicos do organismo.',
    responsible: 'Farmacêuticos Clínicos, Enfermeiros em plantão ou Equipe Assistida Habilitada',
    materials: 'Monitor de pressão de braço ou pulso homologado pela ANVISA e INMETRO, ficha de anotação cardiológica.',
    procedure: 'I. Conduzir o cliente ao ambiente clínico garantindo o relaxamento cardiovascular em repouso absoluto por mínimo 5 (cinco) minutos;\nII. Orientar postura imóvel e sentada sobre cadeira encostada, pernas sem cruzamento anatômico e manter braço repousado sobre bancada horizontal na linha do tórax cardiaco;\nIII. Firmar a braçadeira mecânica do analisador perfeitamente sobre a derme no membro do corpo, alinhando setas metrológicas;\nIV. Ativar o acionamento elétrico e aguardar medição do barômetro;\nV. Obter valores sistólicos e diastólicos correspondentes aos parâmetros emitidos;\nVI. Fazer anotação no prontuário de atenção farmacêutica do paciente em vias físicas idôneas;\nVII. Orientar o paciente quanto a hábitos de vida saudáveis e, caso detectadas hipertensões acentuadas acentuadas, encaminhá-lo para avaliação médica imediata.',
    monitoring: 'Auditoria técnica periódica e calibração de esfigmomanômetro a cada 6 meses com selo atualizado.',
    reviewFrequency: 'Anual',
    references: 'VII Diretrizes Brasileiras de Hipertensão Arterial; RDC ANVISA nº 44 de 17 de Agosto de 2009.',
    tables: [
      {
        title: "TABELA DE INTERPRETAÇÃO OPERACIONAL DA PRESSÃO EM ADULTOS",
        headers: ["Sistólica (mmHg)", "Diastólica (mmHg)", "Classificação de Risco", "Medida/Retorno Sugerido"],
        rows: [
          ["< 120", "< 80", "Ótima / Normal", "Acompanhar em 1 ano"],
          ["120 a 139", "80-89", "Normal Limítrofe", "Refazer teste em 6 meses"],
          ["140 a 159", "90-99", "Hipertensão Estágio I (Leve)", "Consulta médica sugerida"],
          ["160 a 179", "100-109", "Hipertensão Estágio II (Moderada)", "Orientação clínica programada"],
          [">= 180", ">= 110", "Hipertensão Estágio III (Grave)", "Pronto atendimento imediato"],
          [">= 140", "< 90", "Hipertensão Sistólica Isolada", "Refazer teste em 2 meses"]
        ]
      }
    ]
  },
  {
    id: 'controle-glicemia-capilar',
    code: 'POP Nº 016',
    title: 'CONTROLE DE GLICEMIA CAPILAR',
    category: 'Serviços Farmacêuticos',
    objective: 'Metodizar a verificação sanguínea de teores quantitativos de glicose com fita ativa de reação em sangue capilar.',
    applicationField: 'Área reservada de procedimentos farmacêuticos clínicos.',
    definitions: 'Glicose Capilar: teores sanguíneos imediatos de carboidratos medidos em gotícula de sangue extraída da polpa digital.',
    responsible: 'Farmacêutico Responsável de Plantão Habilitado',
    materials: 'Glicosímetro digital G.TECH Free calibrado, lancetas estéreis com trava de segurança, tiras químicas reagentes ativas correspondentes, álcool, luvas.',
    epi: 'Luvas de proteção descartáveis, jaleco de botões completo.',
    riscos: 'Contaminações patogênicas por perfurações acidentais na equipe de trabalho.',
    procedure: 'I. Solicitar que o cliente realize higienização das mãos com água e sabonete ou efetuar antissepsia com algodão e álcool;\nII. Desinfectar a bandeja e apoiar o medidor eletrônico G.TECH Free;\nIII. Introduzir fita reagente estéril ativa correspondente no conector eletrônico do leitor;\nIV. Realizar punctura rápida lateral do lóbulo distal do dedo indicador com lanceta estéril retrátil de disparo automático;\nV. Aplicar a gota sanguínea imediata sobre a fita reagente ativa, aguardando decodificação eletrônica celular;\nVI. Estancar punctura com algodão sêco pressionado;\nVII. Ler o resultado metabólico do painel e anotar de forma detalhada;\nVIII. Descartar fitas usadas e agulhas na caixa de resíduos Descarpack.',
    monitoring: 'Análise de integridade de lotes de sensores e fitas reagentes duas vezes ao mês.',
    reviewFrequency: 'Anual',
    references: 'Sociedade Brasileira de Diabetes (SBD) 2009; RDC ANVISA nº 44 de 17 de Agosto de 2009.'
  },
  {
    id: 'perfuracao-lobulo-brincos',
    code: 'POP Nº 017',
    title: 'PERFURAÇÃO DE LÓBULO AURICULAR E COLOCAÇÃO DE BRINCOS',
    category: 'Serviços Farmacêuticos',
    objective: 'Realizar furos de adorno no lóbulo das orelhas sob técnica estéril protegida contra infecções lobulares.',
    applicationField: 'Sala reservada higiênica de assepsia e injetáveis.',
    definitions: 'Perfuração de Adorno: técnica assistida de penetração tecidual lobular auricular para fins de utilização de brincos estéreis.',
    responsible: 'Farmacêutico Responsável devidamente Habilitado',
    materials: 'Pistola perfuradora de brincos Perfur registrada, brincos estéreis selados na embalagem original, caneta marcadora descartável, álcool 70%, espelho.',
    procedure: 'I. Inspecionar clinicamente o lóbulo tecidual da pessoa. Inaptidão caso constatadas queloides, infecções, tumorações ou espinhas locais. Em diabéticos ou hemofílicos requer autorização prévia por escrito do médico assistente;\nII. Explicar passo-a-passo os métodos para mitigar sustos operacionais e coletar assinatura no livro de declaração corporativo;\nIII. Fazer a anotação indelével de número de lote técnico e do modelo do brinco;\nIV. Fazer higienização das orelhas com compressa de álcool a 70% e secar;\nV. Marcar simetricamente os locais com a ponta de caneta violeta genciana higiênica e validar de comum acordo face ao espelho;\nVI. Encaixar o cartucho estéril inviolável diretamente no trilho do canhão da pistola Perfur;\nVII. Fixar mira concêntrica ao ponto e acionar gatilho rápido para perfuração e acoplamento autóctone;\nVIII. Orientar rotinas de cicatrização limpando o local diariamente e promovendo rotações de brinco delicadas na primeira semana.',
    monitoring: 'Auditoria de preenchimento dos cadastros de termos de consentimento e validade de selos de brincos.',
    reviewFrequency: 'Anual',
    references: 'Manual Técnico do Fabricante de Brincos Perfur do Brasil; RDC 44/2009.'
  },
  {
    id: 'manutencao-equipamentos',
    code: 'POP Nº 018',
    title: 'MANUTENÇÃO E AFERIÇÃO DE APARELHOS E EQUIPAMENTOS',
    category: 'Garantia da Qualidade',
    objective: 'Assegurar que toda a infraestrutura eletromédica da drogaria esteja calibrada segundo referências metrológicas de agências homologadas.',
    applicationField: 'Balcões, escritórios, consultórios e retaguarda operacional.',
    definitions: 'Manutenção Preventiva: intervenções mecânicas periódicas programadas para detectar falhas operacionais antes que ocorram danos.',
    responsible: 'Responsável Técnico da Drogaria e Coordenador operacional',
    materials: 'Painel metrológico de calibrações vigentes, formulários eletrônicos de registro.',
    procedure: 'I. Verificar periodicamente as conformidades cronológicas de calibração metrológica dos aparelhos eletrônicos em consonância com editais de fabricantes (mínimo uma vez ao ano);\nII. Lançar as vistorias de manutenções no livro técnico cadastral geral de equipamentos;\nIII. Colar imediatamente as etiquetas adesivas comprovando a certificação com prazos vigentes visíveis no invólucro do aparelho;\nIV. Equipamentos Médicos cobertos: aparelhos de aferimento de Pressão Arterial Electronic Blood Pressure Meter serial CKA155190200662 Lote 1902151300A5 (calibração exigida anualmente); geladeiras biomédicas; termômetros Incoterm; glicosímetros clínicos G.TECH.',
    monitoring: 'Avaliação visual quinzenal de conformidade de carimbos cronológicos em etiquetas de aparelhos.',
    reviewFrequency: 'Anual',
    references: 'RDC ANVISA nº 44 de 17 de Agosto de 2009; Portarias Metrológicas Brasileiras.'
  },
  {
    id: 'admissao-funcionarios',
    code: 'POP Nº 019',
    title: 'ADMISSÃO DE FUNCIONÁRIOS',
    category: 'Recursos Humanos',
    objective: 'Garantir padronização técnica sanitária e de conduta moral de colaboradores recrutados por preenchimento de quadro na corporação.',
    applicationField: 'Todos os setores operacionais da drogaria.',
    definitions: 'Treinamento de Integração Sanitária: repasse de diretrizes sanitárias da drogaria para novos contratados.',
    responsible: 'Setor de Recursos Humanos, Encarregados Setoriais e Farmacêuticos Responsáveis',
    materials: 'Fichas admissionais cadastrais completas, apostilas integradoras das Boas Práticas.',
    procedure: 'I. Encaminhar pedido de vaga com detalhamento técnico de competência exigida;\nII. Realizar o rastreio curricular setorial prévio;\nIII. Convocar processo seletivo elegendo três finalistas funcionais;\nIV. Efetuar inquirições profissionais contextualizadas com as responsabilidades;\nV. Informar ao contratado carga de horários, regras de conduta estipuladas e emitir o itinerário obrigatório preventivo para o exame admissional (ASO);\nVI. Coletar carteira e documentações legais adicionais na pasta do RH;\nVII. Iniciar o treinamento intensivo e específico de integração acerca de Boas Práticas de Dispensação e Limpezas da drogaria antes de assumir balcão físico.',
    monitoring: 'Presença obrigatória de documentação admissional e assinaturas na ficha do RH antes de assumir funções.',
    reviewFrequency: 'Anual',
    references: 'Consolidação das Leis do Trabalho (CLT); Legislação de Boas Práticas Farmacêuticas.'
  },
  {
    id: 'exames-medicos',
    code: 'POP Nº 020',
    title: 'EXAMES MÉDICOS',
    category: 'Recursos Humanos',
    objective: 'Implementar a saúde ocupacional e medicina do trabalho, salvaguardando colaboradores e clientes de infecções transmissíveis ou inaptidões físicas do labor.',
    applicationField: 'Todo o contingente físico de colaboradores ativos da Drogaria Farma Serrano.',
    definitions: 'ASO (Atestado de Saúde Ocupacional): documento médico legal atestando aptidões físicas e psicológicas ao desempenho de atividades específicas.',
    responsible: 'Administração Geral da Drogaria, Gestor Comercial',
    materials: 'Guias de encaminhamento ASO homologadas pelo serviço médico credenciado PCMSO.',
    procedure: 'I. EXAME ADMISSIONAL:\na) Recrutar e encaminhar o colaborador aprovado ao médico credenciado para verificação ocupacional geral antes de assumir qualquer serviço clínico;\nb) Exigir retenção das vias físicas do ASO na ficha física individual arquivada na drogaria;\nc) Remeter o funcionário anualmente ou a cada doze meses para exames periódicos de monitoramento clínico.\n\nII. EXAME PERIÓDICO:\na) Vistoriar anualmente a integridade física de todos os colaboradores mantendo vigilância operacional de saúde ativa.\n\nIII. EXAME DE RETORNO AO TRABALHO:\na) Obrigatório em casos de afastamento das atividades laborais por períodos superiores a trinta dias contínuos (por razões de partos, cirurgias ou agravos sistêmicos).\n\nIV. EXAME DE MUDANÇA DE FUNÇÃO:\na) Executar antes de assumir nova função se houver incremento de riscos laborais biológicos distintos.\n\nV. EXAME DEMISSIONAL:\na) Efetivar exames no ato do encerramento de vínculo e desligamento do trabalhador das escalas físicas.',
    monitoring: 'Auditoria de validade geral de cronogramas do ASO arquivados mensalmente no escritório.',
    reviewFrequency: 'Anual',
    references: 'Norma Regulamentadora nº 7 (NR-7) da Secretaria de Trabalho / MTE; RDC ANVISA nº 44 de 17 de Agosto de 2009.'
  },
  {
    id: 'exposicao-organizacao-produtos',
    code: 'POP Nº 021',
    title: 'EXPOSIÇÃO E ORGANIZAÇÃO DOS PRODUTOS PARA COMERCIALIZAÇÃO',
    category: 'Logística Farmacêutica',
    objective: 'Assegurar que medicamentos perigosos no balcão de vendas e os insumos correlatos do autosserviço obedeçam a regras rígidas de posicionamento estipulado pela agência sanitária.',
    applicationField: 'Área física de recepção, gôndolas fáceis e balcão técnico operacional da farmácia.',
    definitions: 'Exposição Protegida: posicionamento de medicamentos sob prescrição fora de canais de alcance manual livre de usuários.',
    responsible: 'Farmacêutico Responsável de Plantão e Repositores',
    materials: 'Sinalizações de gôndolas, cartazes mandatórios da vigilância sanitária local.',
    procedure: 'I. Posicionar medicamentos submetidos à prescrição clínica exclusivamente atrás do balcão principal, limitando o contato físico direto de pacientes;\nII. Fixar de forma ostensiva o cartaz legível: "MEDICAMENTOS PODEM CAUSAR EFEITOS INDESEJADOS. EVITE A AUTOMEDICAÇÃO. INFORME-SE COM O FARMACÊUTICO";\nIII. Itens comuns de passagem em gôndolas e displays de auto-atendimento são estritamente limitados a substâncias homologadas Anvisa:\n- Produtos fitoterápicos de livre acesso e chás;\n- Matérias-primas de plantas medicinais regulamentadas pelas farmácias;\n- Acessórios de puericultura infantil leve (mamadeiras, chupetas, bicos e protetores);\n- Instrumentários de cutelaria (lixas descartáveis, alicates, espátulas de unhas, lâminas comuns);\n- Essências florais preparadas;\n- Alimentos para fins especiais de regime calórico energético (nutricional, dietéticos, hipertensos, fórmulas de recém-nascido, enteral);\n- Brincos para furos estéreis Perfur;\n- Medicamentos isentos de prescrição MIPs devidamente listados na instrução normativa.',
    monitoring: 'Rastreio visual diário de balcões e displays na drogaria pelo Responsável Técnico.',
    reviewFrequency: 'Anual',
    references: 'RDC ANVISA nº 44 de 17 de Agosto de 2009; Lei Federal 5991/1973; Diretrizes de Autosserviço.'
  },
  {
    id: 'gerenciamento-residuos',
    code: 'POP Nº 022',
    title: 'GERENCIAMENTO DE RESÍDUOS',
    category: 'Garantia da Qualidade',
    objective: 'Implementar o plano ambiental institucional para descarte, manejo, transporte temporário e pesagem final de substâncias residuais farmacêuticas.',
    applicationField: 'Toda a extensão física da farmácia, incluindo refeitórios e sanitários.',
    definitions: 'PGRSS: Plano de Gerenciamento de Resíduos de Serviços de Saúde, normatizando o manejo das frações químicas e biológicas.',
    responsible: 'Farmacêutico Coordenador de Plantão e Colaboradores de Higienização',
    materials: 'Caixa de papelão rígido (Descarpack), sacos brancos leitosos de 30L para resíduos do Grupo A, recipientes identificados para o Grupo B, fitas, lacres.',
    epi: 'Avental clínico, luvas grossas de borracha especial para higienização profissional.',
    riscos: 'Inoculação infecciosa por furos com agulhas usadas, contaminações ambientais graves.',
    procedure: 'SEGREGAÇÃO DE ATIVOS SEGUNDO CLASSIFICAÇÃO LEGAL PGRSS:\n\nGRUPO A (Resíduos Infecciosos ou Biológicos):\n- Soluções celulares, materiais de gaze ou panos embebidos em sangue humano no atendimento de injetáveis ou glicoses, luvas e tiras de testes usadas.\n- Mover de imediato para lixeiras clínicas de pedal acopladas, forradas com saco branco leitoso de 30L com identificação "RESÍDUO BIOLÓGICO".\n- Ao preencher 2/3 da capacidade do saco, fechar firmemente e direcionar para o local externo vermelho de guarda provisória (mínimo de 10cm suspenso do solo).\n\nGRUPO B (Resíduos Químicos e Perigosos):\n- Flocos moleculares e medicamentos fora de validade, controlados ou com avaria de embalagens.\n- Armazenar de forma separada sob caixa de papelão robusta e fechar adequadamente.\n- No caso de medicamentos psicotrópicos controlados pela Portaria 344/98, requerer homologação física com data e carimbo de recebimento da Vigilância local comprovando sua descontinuidade no SNGPC.\n\nGRUPO D (Resíduos Comuns):\n- Papéis secos, resíduos das áreas comuns, copos plásticos descartados na recepção, restos de alimentos de lanches comuns.\n- Descarte em lixos pretos comuns.\n\nGRUPO E (Materiais Perfurocortantes):\n- Lâminas de barbear usadas, agulhas descartáveis de injeções, ampolas de vidro fraturadas ordinárias, lancetas capilares de testes.\n- Descarte imperativo nas caixas de papelão amarelas rígidas Descarpack com canais de vedação. Descartar sem reencapar.\n- Descontinuidade da caixa ao atingir a linha limítrofe impressa pelo fabricante.',
    monitoring: 'Auditoria mensal e arquivo obrigatório dos comprovantes de pesagem ambiental emitidos pela empresa coletora contratada.',
    reviewFrequency: 'Anual',
    references: 'Resolução ANVISA RDC nº 306 de 07 de Dezembro de 2004; RDC 44/2009; Resolução CONAMA 358/2005.',
    tables: [
      {
        title: "FLUXO DE DESTINAÇÃO DO PLANO PGRSS DA DROGARIA",
        headers: ["Grupo de Resíduo", "Elementos Cobertos", "Acondicionamento Recomendado", "Disposição e Tratamento Final"],
        rows: [
          ["Grupo A - Infecciosos", "Gaze com sangue, tiras glicose, luvas, cotonetes", "Saco branco leitoso 30L em lixeira de pedal com tampa", "Autoclavagem ou Incineração técnica licenciada"],
          ["Grupo B - Químicos", "Remédios vencidos, sobras controladas Portaria 344", "Caixa de papelão identificada e isolada em almoxarifado", "Incineração industrial ou aterro especial classe I"],
          ["Grupo D - Comuns", "Copos descartáveis, papel toalha limpo, restos comuns", "Saco plástico preto ou azul resistente", "Coleta urbana comum municipal de lixo reciclável / aterro"],
          ["Grupo E - Perfurocortantes", "Agulhas de aplicação, lancetas, ampolas quebradas", "Recipiente rígido amarelo de segurança (Descarpack)", "Incineração industrial regulamentada PGRSS"]
        ]
      }
    ]
  },
  {
    id: 'atencao-farmaceutica',
    code: 'POP Nº 023',
    title: 'ATENÇÃO FARMACÊUTICA',
    category: 'Farmácia Clínica',
    objective: 'Dar as diretrizes clínicas de acolhimento farmacoterapêutico para controle de doenças em consultórios de assistência clínica.',
    applicationField: 'Sala reservada ou consultório clínico de Atenção Farmacêutica.',
    definitions: 'Atenção Farmacêutica: relação humanizada onde o profissional gerencia a farmacoterapia de pacientes visando sanar problemas terapêuticos.',
    responsible: 'Responsável Técnico Farmacêutico devidamente Credenciado',
    materials: 'Fichas de acompanhamento anamnese clínicas, balança de bioimpedância, carimbos, fichários.',
    procedure: 'I. Prestar acolhimento humanizado sistemático promovendo anamnese verbal e identificando o contexto real do paciente;\nII. Atuar ativamente na resolução de PRMs (Problemas Relacionados aos Medicamentos), comunicando-se com os médicos se identificadas polifarmácias inseguras;\nIII. Disponibilizar de forma ostensiva o itinerário oficial dos postos de saúde do SUS mais próximos;\nIV. Registrar de próprio punho ou eletronicamente todos os episódios de intervenções de forma confidencial com o devido consentimento físico do paciente;\nV. Emitir em duas vias a Declaração de Serviço Farmacêutico correspondente entregando a via preferencial ao paciente;\nVI. Resguardar o sigilo absoluto de diagnósticos e fichas terapêuticas formuladas em consultório.',
    monitoring: 'Auditoria de arquivo de fichas de anamnese formuladas pelo Farmacêutico Clínico.',
    reviewFrequency: 'Anual',
    references: 'Resolução CFF nº 585/2013; RDC ANVISA nº 44 de 17 de Agosto de 2009; Lei Federal 5991/1973.'
  },
  {
    id: 'capacitacao-colaboradores',
    code: 'POP Nº 024',
    title: 'CAPACITAÇÃO OPERACIONAL DOS COLABORADORES',
    category: 'Recursos Humanos',
    objective: 'Assegurar que toda a força de trabalho da drogaria esteja qualificada sanitariamente sobre as regras regulamentares do setor comercial farmacêutico.',
    applicationField: 'Todos os colaboradores e setores operacionais da Drogaria Farma Serrano.',
    definitions: 'Treinamento Continuado: rotina cronológica de reciclagem formativa de conduta higiênica e Boas Práticas.',
    responsible: 'Farmacêutico Responsável de Plantão, Coordenadores corporativos',
    materials: 'Cronograma anual de capacitações, apostilas técnicas das reuniões, lista física de presenças.',
    procedure: 'a) Promover o treinamento recorrente de todos os colaboradores acerca de leis sanitárias, segurança laboral e conformidades regulamentares;\nb) Disseminar conceitos biológicos de autocuidado higiene pessoal, contaminação microbiológica essencial e preservação ambiental das gôndolas;\nc) Capacitar toda a equipe sobre recolhimento de EPIs segurança de descarte PGRSS e descarte sanitário correto;\nd) Instruir rotinas de resposta rápida em acidentes com agulhas ou desvios de produtos químicos;\ne) Lançar atas de reuniões detalhando: Título Oficial do Treinamento, Objetivos Técnicos, Conteúdos, Data e Duração física em Horas, Assinaturas visíveis da equipe e Avaliação de eficácia.',
    monitoring: 'Presença obrigatória de ata de capacitação corporativa assinada em arquivo físico anual.',
    reviewFrequency: 'Anual',
    references: 'RDC ANVISA nº 44 de 17 de Agosto de 2009; Recomendações Técnicas de RH / MTE.'
  },
  {
    id: 'plano-contingencia-energia',
    code: 'POP Nº 025',
    title: 'PLANO DE CONTINGÊNCIA EM CASO DE QUEDA DE ENERGIA NA REDE GERAL',
    category: 'Garantia da Qualidade',
    objective: 'Salvaguardar os medicamentos e vacinas termolábeis vulneráveis contidos em refrigeração de degradações mecânicas em quedas de suprimento elétrico comum.',
    applicationField: 'Geladeira térmica biomédica de medicamentos termolábeis e quadro elétrico da corporação.',
    definitions: 'Termolábeis: substâncias moleculares farmacológicas sensíveis ao calor que requerem temperatura rigidamente controlada de 2ºC a 8ºC.',
    responsible: 'Farmacêutico Responsável de Plantão e Toda a Equipe Operacional da drogaria',
    materials: 'Subestação geradora STEMAC diesel ativa, caixas isolantes com gelo acumulador térmico reciclável emergencial.',
    procedure: 'Atividades operacionais em quedas imediatas de energia na rede pública:\n1. A drogaria dispõe tecnicamente de um equipamento gerador elétrico STEMAC que é acionado de forma ágil e automática no momento de queda do fornecimento elétrico;\n2. Manter a verificação quinzenal do nível de óleo combustível e baterias do motor STEMAC do gerador;\n3. Caso ocorram falhas operacionais mecânicas do gerador, providenciar de imediato a remoção física dos medicamentos termolábeis e inseri-los em recipientes herméticos térmicos (Gelo Seco / Reciclável) monitorando a variação de calor térmico com ampolas de termômetros.',
    monitoring: 'Instaurar testes quinzenais documentados de acionamento rápido e carga de bateria do motor STEMAC.',
    reviewFrequency: 'Anual',
    references: 'RDC ANVISA nº 44 de 17 de Agosto de 2009; Manuais de Engenharia de Suporte Térmico STEMAC.'
  }
];
