-- =============================================================================
-- FitTrack — biblioteca de exercícios pré-carregada (78 exercícios globais)
-- user_id IS NULL => visível para todos os usuários autenticados, somente leitura.
-- A migração é idempotente: reexecutar não duplica nem sobrescreve nada.
-- =============================================================================

with novos (name, muscle_group, equipment, instructions) as (
  values
  -- ------------------------------------------------------------------- PEITO
  ('Supino reto com barra', 'peito', 'barra', 'Deite no banco com os pés firmes no chão. Desça a barra até a linha do mamilo controlando o movimento e empurre até estender os braços sem travar os cotovelos.'),
  ('Supino inclinado com barra', 'peito', 'barra', 'Banco a 30-45°. Desça a barra até a parte alta do peito e empurre para cima. Ênfase na porção superior do peitoral.'),
  ('Supino declinado com barra', 'peito', 'barra', 'Banco declinado a 15-30°. Desça a barra até a parte baixa do peito. Ênfase na porção inferior do peitoral.'),
  ('Supino reto com halteres', 'peito', 'halteres', 'Halteres na altura do peito, palmas para frente. Empurre unindo os halteres no topo sem batê-los. Maior amplitude que a barra.'),
  ('Supino inclinado com halteres', 'peito', 'halteres', 'Banco a 30-45°. Desça os halteres ao lado do peito e empurre para cima e para dentro.'),
  ('Crucifixo com halteres', 'peito', 'halteres', 'Deitado, braços abertos com leve flexão fixa nos cotovelos. Abra até sentir alongar o peito e feche como se abraçasse.'),
  ('Crossover na polia', 'peito', 'polia', 'Em pé, um pé à frente, polias altas. Traga as mãos para frente e para baixo cruzando levemente. Mantenha o tronco firme.'),
  ('Voador na máquina (peck deck)', 'peito', 'máquina', 'Costas apoiadas, antebraços nas almofadas. Una os braços à frente e volte devagar controlando a abertura.'),
  ('Flexão de braço', 'peito', 'peso do corpo', 'Mãos na largura dos ombros, corpo alinhado. Desça até o peito quase tocar o chão mantendo o abdômen contraído.'),
  ('Mergulho em paralelas', 'peito', 'peso do corpo', 'Tronco inclinado à frente nas paralelas. Desça até sentir alongar o peito e suba estendendo os braços.'),

  -- ------------------------------------------------------------------ COSTAS
  ('Barra fixa pronada', 'costas', 'barra fixa', 'Pegada pronada mais larga que os ombros. Puxe levando o peito à barra e desça controlado até estender os braços.'),
  ('Barra fixa supinada', 'costas', 'barra fixa', 'Pegada supinada na largura dos ombros. Puxe o corpo para cima; recruta mais bíceps que a versão pronada.'),
  ('Puxada frontal na polia alta', 'costas', 'polia', 'Sentado, pegada aberta pronada. Puxe a barra até a parte alta do peito projetando o peito à frente, sem jogar o tronco para trás.'),
  ('Puxada supinada na polia alta', 'costas', 'polia', 'Pegada supinada na largura dos ombros. Puxe a barra até o peito mantendo os cotovelos próximos ao corpo.'),
  ('Remada curvada com barra', 'costas', 'barra', 'Tronco inclinado a 45°, coluna neutra. Puxe a barra em direção ao umbigo e desça controlando. Não arredonde as costas.'),
  ('Remada unilateral com halter', 'costas', 'halteres', 'Apoie uma mão e um joelho no banco. Puxe o halter em direção ao quadril mantendo o tronco estável.'),
  ('Remada baixa na polia', 'costas', 'polia', 'Sentado com pés apoiados, coluna neutra. Puxe o triângulo até o abdômen juntando as escápulas.'),
  ('Remada cavalinho', 'costas', 'barra', 'Tronco inclinado sobre a barra em T. Puxe em direção ao abdômen e desça controlado.'),
  ('Pulldown com braços estendidos', 'costas', 'polia', 'Em pé, braços estendidos na barra alta. Empurre a barra até as coxas sem flexionar os cotovelos. Isola o dorsal.'),
  ('Remada na máquina articulada', 'costas', 'máquina', 'Peito apoiado no suporte. Puxe os pegadores em direção ao tronco juntando as escápulas.'),
  ('Levantamento terra', 'costas', 'barra', 'Pés na largura do quadril, barra junto às canelas. Suba estendendo quadril e joelhos juntos, coluna neutra do início ao fim.'),
  ('Encolhimento de ombros com barra', 'costas', 'barra', 'Em pé segurando a barra à frente. Eleve os ombros em direção às orelhas e desça devagar. Sem rotacionar os ombros.'),

  -- ----------------------------------------------------------------- PERNAS
  ('Agachamento livre com barra', 'pernas', 'barra', 'Barra nos trapézios, pés na largura dos ombros. Desça até a coxa ficar paralela ao chão mantendo os joelhos alinhados aos pés.'),
  ('Agachamento frontal', 'pernas', 'barra', 'Barra apoiada nos deltoides anteriores, cotovelos altos. Desça mantendo o tronco o mais vertical possível.'),
  ('Leg press 45 graus', 'pernas', 'máquina', 'Pés na plataforma na largura dos ombros. Desça até cerca de 90° de flexão do joelho sem descolar o quadril do apoio.'),
  ('Agachamento no hack machine', 'pernas', 'máquina', 'Costas apoiadas no equipamento. Desça controlando até os joelhos formarem 90° e empurre com os pés.'),
  ('Cadeira extensora', 'pernas', 'máquina', 'Sentado com o rolo acima dos tornozelos. Estenda os joelhos até quase travar e volte devagar.'),
  ('Mesa flexora', 'pernas', 'máquina', 'Deitado de bruços, rolo acima dos tornozelos. Flexione os joelhos levando os pés ao glúteo e desça controlado.'),
  ('Cadeira flexora', 'pernas', 'máquina', 'Sentado, rolo na parte de trás das pernas. Flexione os joelhos puxando o rolo para baixo e para trás.'),
  ('Afundo com halteres', 'pernas', 'halteres', 'Um passo à frente, desça até o joelho de trás quase tocar o chão. Mantenha o tronco ereto e volte à posição inicial.'),
  ('Passada com halteres', 'pernas', 'halteres', 'Caminhe alternando passadas longas, descendo o joelho de trás em direção ao chão a cada passo.'),
  ('Stiff com barra', 'pernas', 'barra', 'Joelhos levemente flexionados. Desça a barra junto às pernas empurrando o quadril para trás até sentir alongar o posterior.'),
  ('Agachamento búlgaro', 'pernas', 'halteres', 'Pé de trás apoiado no banco. Desça flexionando a perna da frente até 90° mantendo o tronco estável.'),
  ('Agachamento sumô com halter', 'pernas', 'halteres', 'Pés bem afastados e pontas para fora, halter entre as pernas. Desça mantendo os joelhos alinhados com os pés.'),
  ('Panturrilha em pé no smith', 'pernas', 'smith', 'Pontas dos pés em um step, barra nos ombros. Suba na ponta dos pés ao máximo e desça alongando a panturrilha.'),
  ('Panturrilha sentado', 'pernas', 'máquina', 'Sentado com as pontas dos pés na plataforma. Eleve os calcanhares ao máximo e desça devagar buscando amplitude total.'),

  -- ----------------------------------------------------------------- OMBROS
  ('Desenvolvimento militar com barra', 'ombros', 'barra', 'Em pé, barra na altura das clavículas. Empurre acima da cabeça sem arquear a lombar e desça controlado.'),
  ('Desenvolvimento com halteres', 'ombros', 'halteres', 'Sentado com apoio nas costas. Empurre os halteres acima da cabeça e desça até a altura das orelhas.'),
  ('Desenvolvimento Arnold', 'ombros', 'halteres', 'Comece com as palmas voltadas para você e rotacione os punhos enquanto empurra acima da cabeça.'),
  ('Elevação lateral com halteres', 'ombros', 'halteres', 'Em pé, braços ao lado do corpo com leve flexão. Eleve até a altura dos ombros liderando com os cotovelos.'),
  ('Elevação frontal com halteres', 'ombros', 'halteres', 'Eleve os halteres à frente até a altura dos ombros, alternando ou juntos. Evite balançar o tronco.'),
  ('Elevação lateral na polia', 'ombros', 'polia', 'Polia baixa cruzada à frente do corpo. Eleve o braço lateralmente até a altura do ombro com tensão constante.'),
  ('Crucifixo inverso na máquina', 'ombros', 'máquina', 'Peito apoiado, braços à frente. Abra os braços para trás contraindo o deltoide posterior.'),
  ('Remada alta com barra', 'ombros', 'barra', 'Pegada pronada média. Puxe a barra até a altura do peito com os cotovelos acima dos punhos.'),
  ('Face pull na polia', 'ombros', 'polia', 'Polia na altura do rosto com corda. Puxe em direção à testa abrindo os cotovelos para fora.'),

  -- ----------------------------------------------------------------- BÍCEPS
  ('Rosca direta com barra', 'biceps', 'barra', 'Em pé, pegada supinada na largura dos ombros. Flexione os cotovelos sem mover os ombros e desça controlando.'),
  ('Rosca alternada com halteres', 'biceps', 'halteres', 'Em pé ou sentado. Flexione um braço por vez girando o punho para fora no topo do movimento.'),
  ('Rosca martelo', 'biceps', 'halteres', 'Pegada neutra (palmas voltadas para dentro). Flexione os cotovelos mantendo os punhos firmes.'),
  ('Rosca no banco Scott', 'biceps', 'barra', 'Braços apoiados no banco inclinado. Flexione os cotovelos em amplitude total sem descolar os braços do apoio.'),
  ('Rosca concentrada', 'biceps', 'halteres', 'Sentado, cotovelo apoiado na coxa interna. Flexione o braço lentamente até a contração máxima.'),
  ('Rosca na polia baixa', 'biceps', 'polia', 'Em pé de frente para a polia baixa. Flexione os cotovelos mantendo tensão constante na subida e na descida.'),
  ('Rosca inversa com barra', 'biceps', 'barra', 'Pegada pronada. Flexione os cotovelos trabalhando braquial e antebraço. Use carga menor que na rosca direta.'),
  ('Rosca inclinada com halteres', 'biceps', 'halteres', 'Banco a 45°, braços pendendo atrás do corpo. Flexione os cotovelos a partir do alongamento máximo do bíceps.'),

  -- ---------------------------------------------------------------- TRÍCEPS
  ('Tríceps na polia com barra reta', 'triceps', 'polia', 'Em pé de frente para a polia alta. Estenda os cotovelos mantendo-os junto ao corpo e volte controlado.'),
  ('Tríceps na polia com corda', 'triceps', 'polia', 'Estenda os cotovelos abrindo as pontas da corda no final do movimento para máxima contração.'),
  ('Tríceps testa com barra EZ', 'triceps', 'barra', 'Deitado no banco, barra acima da testa. Flexione só os cotovelos descendo a barra e estenda sem mover os ombros.'),
  ('Tríceps francês com halter', 'triceps', 'halteres', 'Sentado, halter acima da cabeça com as duas mãos. Desça atrás da cabeça e estenda os cotovelos.'),
  ('Tríceps coice com halter', 'triceps', 'halteres', 'Tronco inclinado, braço colado ao corpo. Estenda o cotovelo até o braço ficar reto e volte devagar.'),
  ('Mergulho no banco', 'triceps', 'peso do corpo', 'Mãos na borda do banco atrás do corpo. Desça flexionando os cotovelos a 90° e empurre para cima.'),
  ('Supino com pegada fechada', 'triceps', 'barra', 'Pegada na largura dos ombros. Desça a barra ao peito com os cotovelos próximos ao tronco e empurre.'),
  ('Tríceps na máquina', 'triceps', 'máquina', 'Sentado no equipamento. Estenda os cotovelos contra a resistência e retorne controlando a carga.'),

  -- ---------------------------------------------------------------- ABDÔMEN
  ('Abdominal crunch no solo', 'abdomen', 'peso do corpo', 'Deitado, joelhos flexionados. Eleve o tronco contraindo o abdômen sem puxar a cabeça com as mãos.'),
  ('Elevação de pernas no solo', 'abdomen', 'peso do corpo', 'Deitado, pernas estendidas. Eleve as pernas até 90° e desça sem tocar o chão, mantendo a lombar apoiada.'),
  ('Prancha isométrica', 'abdomen', 'peso do corpo', 'Apoie antebraços e pontas dos pés. Mantenha corpo alinhado e abdômen contraído pelo tempo determinado.'),
  ('Prancha lateral', 'abdomen', 'peso do corpo', 'Apoiado em um antebraço e na lateral do pé. Eleve o quadril e mantenha a linha do corpo.'),
  ('Abdominal na polia alta', 'abdomen', 'polia', 'Ajoelhado de costas para a polia, corda junto à cabeça. Flexione o tronco contraindo o abdômen.'),
  ('Elevação de pernas na barra fixa', 'abdomen', 'barra fixa', 'Pendurado na barra. Eleve as pernas estendidas ou os joelhos até a altura do quadril sem balançar.'),
  ('Abdominal bicicleta', 'abdomen', 'peso do corpo', 'Deitado, alterne levando o cotovelo ao joelho oposto em movimento contínuo e controlado.'),
  ('Rotação russa com anilha', 'abdomen', 'anilha', 'Sentado com o tronco inclinado para trás. Gire o tronco levando a anilha de um lado ao outro.'),
  ('Roda abdominal', 'abdomen', 'roda abdominal', 'Ajoelhado, role a roda à frente mantendo a lombar neutra e volte contraindo o abdômen.'),

  -- --------------------------------------------------------------- GLÚTEOS
  ('Elevação pélvica com barra', 'gluteos', 'barra', 'Costas apoiadas no banco, barra sobre o quadril. Eleve o quadril até alinhar tronco e coxas contraindo os glúteos no topo.'),
  ('Ponte de glúteo no solo', 'gluteos', 'peso do corpo', 'Deitado com os joelhos flexionados. Eleve o quadril contraindo os glúteos e desça sem relaxar totalmente.'),
  ('Coice de glúteo na máquina', 'gluteos', 'máquina', 'Apoiado no equipamento. Estenda o quadril para trás contraindo o glúteo e retorne controlado.'),
  ('Coice de glúteo na polia', 'gluteos', 'polia', 'Tornozeleira na polia baixa. Estenda o quadril para trás mantendo o tronco firme e o joelho estável.'),
  ('Cadeira abdutora', 'gluteos', 'máquina', 'Sentado com as almofadas na parte externa das coxas. Abra as pernas contra a resistência e volte devagar.'),
  ('Agachamento sumô com barra', 'gluteos', 'barra', 'Pés bem afastados e pontas para fora. Desça mantendo o tronco ereto; ênfase em glúteos e adutores.'),
  ('Levantamento terra romeno com halteres', 'gluteos', 'halteres', 'Empurre o quadril para trás descendo os halteres junto às pernas. Suba contraindo os glúteos.'),
  ('Afundo reverso com barra', 'gluteos', 'barra', 'Dê um passo para trás e desça até o joelho quase tocar o chão. Suba empurrando com a perna da frente.'),
  ('Step-up no banco', 'gluteos', 'halteres', 'Suba no banco com uma perna por vez empurrando com o glúteo, sem impulso da perna de trás.')
)
insert into public.exercises (user_id, name, muscle_group, equipment, instructions)
select null, n.name, n.muscle_group::public.muscle_group, n.equipment, n.instructions
from novos n
where not exists (
  select 1 from public.exercises e
  where e.user_id is null and lower(e.name) = lower(n.name)
);
