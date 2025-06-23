// Variáveis Globais para armazenar os dados
let config = {};
let filiais = [];
let terceirizadas = [];
let funcionarios = [];
let tarefas = [];
let armazens = []; // Novo array para armazéns
let producoes = [];
let currentUser = null; // Armazena o perfil do usuário logado

// Variáveis temporárias para o lançamento atual
let currentLancamentoTarefas = [];
let currentLancamentoFuncionarios = [];

// Variáveis para Paginação de Funcionários
let currentPageFuncionarios = 1;
const itemsPerPageFuncionarios = 10; // 10 itens por página na tabela de funcionários
let filteredFuncionarios = []; // Usado para armazenar a lista filtrada/buscada para paginação

// Variáveis para Paginação de Relatórios
let currentPageRelatorios = 1;
const itemsPerPageRelatorios = 10; // 10 itens por página na tabela de relatórios
let filteredProducoes = []; // Usado para armazenar a lista filtrada para paginação dos relatórios


// --- Definição de Usuários e Senhas (Perfis) ---
const users = {
    'lancador': { password: '123', profile: 'lancador' },
    'admin': { password: 'admin123', profile: 'admin' }
};

// Função para carregar dados do localStorage
function loadData() {
    config = JSON.parse(localStorage.getItem('config')) || { lastLancamentoNumber: 0 };
    filiais = JSON.parse(localStorage.getItem('filiais')) || [];
    terceirizadas = JSON.parse(localStorage.getItem('terceirizadas')) || [];
    funcionarios = JSON.parse(localStorage.getItem('funcionarios')) || [];
    tarefas = JSON.parse(localStorage.getItem('tarefas')) || [];
    armazens = JSON.parse(localStorage.getItem('armazens')) || []; // Carrega armazéns
    producoes = JSON.parse(localStorage.getItem('producoes')) || [];

    // Garante que todos os lançamentos tenham o statusPagamento, útil para dados antigos
    producoes.forEach(prod => {
        if (!prod.statusPagamento) {
            prod.statusPagamento = 'Pendente';
        }
    });
    saveData(); // Salva para atualizar o localStorage com o status padrão
}

// Função para salvar dados no localStorage
function saveData() {
    localStorage.setItem('config', JSON.stringify(config));
    localStorage.setItem('filiais', JSON.stringify(filiais));
    localStorage.setItem('terceirizadas', JSON.stringify(terceirizadas));
    localStorage.setItem('funcionarios', JSON.stringify(funcionarios));
    localStorage.setItem('tarefas', JSON.stringify(tarefas));
    localStorage.setItem('armazens', JSON.stringify(armazens)); // Salva armazéns
    localStorage.setItem('producoes', JSON.stringify(producoes));
}

// --- Funções de Autenticação e Controle de Acesso ---

function login(event) {
    event.preventDefault(); // Impede o recarregamento da página do formulário
    const usernameInput = document.getElementById('username').value;
    const passwordInput = document.getElementById('password').value;
    const loginMessage = document.getElementById('loginMessage');

    const user = users[usernameInput];

    if (user && user.password === passwordInput) {
        currentUser = user.profile;
        sessionStorage.setItem('loggedInUser', currentUser); // Armazena o perfil na sessão
        loginMessage.textContent = ''; // Limpa qualquer mensagem de erro
        
        document.getElementById('loginScreen').classList.remove('active'); // Esconde tela de login
        document.getElementById('appHeader').style.display = 'block'; // Mostra o cabeçalho do app
        
        applyUserPermissions(); // Aplica permissões de navegação
        showTab('abaLancamento'); // Redireciona para a aba inicial
        showToast(`Bem-vindo, ${usernameInput}!`, 'success');
    } else {
        loginMessage.textContent = 'Usuário ou senha inválidos.';
        showToast('Usuário ou senha inválidos.', 'error');
    }
}

function logout() {
    if (confirm('Tem certeza que deseja sair?')) {
        currentUser = null;
        sessionStorage.removeItem('loggedInUser'); // Remove o perfil da sessão
        
        document.getElementById('appHeader').style.display = 'none'; // Esconde cabeçalho
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active')); // Esconde todas as abas
        document.getElementById('loginScreen').classList.add('active'); // Mostra tela de login
        document.getElementById('username').value = ''; // Limpa campos de login
        document.getElementById('password').value = '';
        showToast('Você foi desconectado.', 'info');
    }
}

function applyUserPermissions() {
    const isAdmin = currentUser === 'admin';
    
    // Controle de visibilidade das abas de navegação
    document.getElementById('navLancamento').style.display = 'inline-block'; // Lançamento sempre visível
    document.getElementById('navCadastros').style.display = isAdmin ? 'inline-block' : 'none';
    document.getElementById('navRelatorios').style.display = isAdmin ? 'inline-block' : 'none';

    // Se estiver na aba de cadastros e não for admin, volta para lançamento
    if (!isAdmin && document.getElementById('abaCadastros').classList.contains('active')) {
        showTab('abaLancamento');
    }
     // Se estiver na aba de relatorios e não for admin, volta para lançamento
     if (!isAdmin && document.getElementById('abaRelatorios').classList.contains('active')) {
        showTab('abaLancamento');
    }
}

// --- Funções de Gerenciamento de Abas ---
function showTab(tabId) {
    // Esconder todas as abas de conteúdo
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Garante que a tela de login esteja oculta ao mostrar qualquer outra aba
    document.getElementById('loginScreen').classList.remove('active');

    // Mostrar a aba selecionada
    document.getElementById(tabId).classList.add('active');

    // Funções específicas para carregar dados ao mudar de aba
    if (tabId === 'abaCadastros') {
        renderFiliais();
        renderTerceirizadas();
        populateFilialSelects();
        populateTerceirizadaSelects();
        populateArmazemSelects(); // Popula armazéns para lançamento
        renderTarefas();
        renderArmazens(); // Renderiza armazéns

        // Para Funcionários: popula o select de filtro e depois renderiza a tabela
        populateFuncionarioTerceirizadaFilters();
        searchAndFilterFuncionarios(); // Aplica filtros e renderiza a tabela de funcionários
        clearFuncionarioForm(); // Limpa o formulário de adição/edição de funcionário
        
    } else if (tabId === 'abaLancamento') {
        populateFilialSelects();
        populateArmazemSelects(); // Popula armazéns para lançamento
        populateInputTarefasSelect(); // Popula o select de tarefas para adição
        clearLancamentoForm(); // Limpa e prepara para um novo lançamento
        // Garante que a primeira seção do acordeão de lançamento esteja aberta ao iniciar
        const firstLancamentoAcordeao = document.querySelector('#abaLancamento .acordeao-item .acordeao-header');
        if (firstLancamentoAcordeao && !firstLancamentoAcordeao.classList.contains('active')) {
            toggleAcordeao(firstLancamentoAcordeao);
        }
    } else if (tabId === 'abaRelatorios') {
        populateRelatorioFilters();
        renderDashboardSummary(); // Renderiza o dashboard
        renderDetailedReport(); // Agora renderiza a tabela com paginação e filtros
        populateCustoSelects(); // Popula selects para relatórios de custo (renomeado)
        generateCustoReport('filial'); // Gera o primeiro relatório de custo por padrão
        generateCustoReport('terceirizada'); // Gera o segundo relatório de custo por padrão
    }
}

// --- Funções de Acordeão (para Cadastros e Lançamento) ---
function toggleAcordeao(button) {
    button.classList.toggle('active');
    const content = button.nextElementSibling;
    if (content.classList.contains('active')) {
        content.classList.remove('active');
        content.style.maxHeight = null;
        content.style.paddingBottom = '0px'; // Remove padding ao fechar
    } else {
        content.classList.add('active');
        content.style.maxHeight = content.scrollHeight + 'px'; // Ajusta a altura dinamicamente
        content.style.paddingBottom = '15px'; // Adiciona padding ao abrir (ajustado para o novo layout)
    }
}

// --- Funções de Feedback (Toasts) ---
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.classList.add('toast', type);
    toast.textContent = message;
    toastContainer.appendChild(toast);

    // Forçar reflow para a transição CSS funcionar
    void toast.offsetWidth; 
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => toast.remove());
    }, 3000); // Remove o toast após 3 segundos
}


// --- Funções de Validação de Formulário ---
function validateField(fieldId, errorMessage) {
    const field = document.getElementById(fieldId);
    // Para selects, o erro pode estar no elemento 'select' em si ou em um span/div imediatamente após
    const errorDiv = document.querySelector(`.error-message[data-field="${fieldId}"]`); 
    let isValid = true;

    if (field.type === 'select-one' && field.value === '') {
        isValid = false;
    } else if (field.type === 'text' || field.type === 'number' || field.type === 'date' || field.type === 'textarea') {
        if (field.value.trim() === '' || (field.type === 'number' && parseFloat(field.value) < 0)) {
            isValid = false;
        }
    }

    if (!isValid) {
        field.classList.add('field-error'); // Adiciona classe diretamente ao campo
        if (errorDiv) {
            errorDiv.textContent = errorMessage;
            errorDiv.style.display = 'block';
        }
    } else {
        field.classList.remove('field-error');
        if (errorDiv) {
            errorDiv.textContent = '';
            errorDiv.style.display = 'none';
        }
    }
    return isValid;
}

function clearValidationMessages() {
    document.querySelectorAll('.error-message').forEach(div => {
        div.textContent = '';
        div.style.display = 'none';
    });
    document.querySelectorAll('.field-error').forEach(el => {
        el.classList.remove('field-error');
    });
}


// --- Funções de Cadastro ---

function addFilial() {
    const nome = document.getElementById('filialNome').value.trim();
    const endereco = document.getElementById('filialEndereco').value.trim();
    if (nome) {
        filiais.push({ id: 'filial' + Date.now(), nome, endereco });
        saveData();
        renderFiliais();
        document.getElementById('filialNome').value = '';
        document.getElementById('filialEndereco').value = '';
        populateFilialSelects(); // Atualiza os selects em outras abas
        populateRelatorioFilters();
        showToast('Filial adicionada com sucesso!', 'success');
    } else {
        showToast('Nome da filial é obrigatório.', 'error');
    }
}

function renderFiliais() {
    const list = document.getElementById('filiaisList');
    list.innerHTML = '';
    filiais.forEach(filial => {
        const li = document.createElement('li');
        li.innerHTML = `${filial.nome} (${filial.endereco}) <button onclick="deleteFilial('${filial.id}')">Excluir</button>`;
        list.appendChild(li);
    });
}

function deleteFilial(id) {
    if (confirm('Tem certeza que deseja excluir esta filial? Isso também removerá terceirizadas e funcionários associados.')) {
        // Remover terceirizadas e funcionários associados a esta filial
        terceirizadas = terceirizadas.filter(t => t.filialId !== id);
        // Garante que funcionários sejam removidos apenas se a terceirizada for removida
        funcionarios = funcionarios.filter(f => !terceirizadas.some(t => t.id === f.empresaTerceirizadaId));
        
        filiais = filiais.filter(f => f.id !== id);
        saveData();
        renderFiliais();
        populateFilialSelects();
        renderTerceirizadas(); // Renderiza novamente terceirizadas e funcionários para refletir as exclusões
        searchAndFilterFuncionarios();
        populateRelatorioFilters();
        showToast('Filial e dados associados excluídos.', 'info');
    }
}

function addTerceirizada() {
    const filialId = document.getElementById('terceirizadaFilialSelect').value;
    const nome = document.getElementById('terceirizadaNome').value.trim();
    const cnpj = document.getElementById('terceirizadaCnpj').value.trim();

    if (filialId && nome) {
        terceirizadas.push({ id: 'terc' + Date.now(), filialId, nome, cnpj });
        saveData();
        renderTerceirizadas();
        document.getElementById('terceirizadaNome').value = '';
        document.getElementById('terceirizadaCnpj').value = '';
        populateTerceirizadaSelects(); // Atualiza os selects em outras abas
        populateRelatorioFilters();
        populateFuncionarioTerceirizadaFilters(); // Atualiza o filtro de funcionários
        showToast('Empresa terceirizada adicionada.', 'success');
    } else {
        showToast('Selecione a filial e insira o nome da terceirizada.', 'error');
    }
}

function renderTerceirizadas() {
    const list = document.getElementById('terceirizadasList');
    list.innerHTML = '';
    terceirizadas.forEach(terc => {
        const filialNome = filiais.find(f => f.id === terc.filialId)?.nome || 'Filial Desconhecida';
        const li = document.createElement('li');
        li.innerHTML = `${terc.nome} (Filial: ${filialNome}${terc.cnpj ? `, CNPJ: ${terc.cnpj}` : ''}) <button onclick="deleteTerceirizada('${terc.id}')">Excluir</button>`;
        list.appendChild(li);
    });
}

function deleteTerceirizada(id) {
    if (confirm('Tem certeza que deseja excluir esta empresa terceirizada? Isso também removerá os funcionários associados.')) {
        funcionarios = funcionarios.filter(f => f.empresaTerceirizadaId !== id); // Remove funcionários associados
        terceirizadas = terceirizadas.filter(t => t.id !== id);
        saveData();
        renderTerceirizadas();
        searchAndFilterFuncionarios();
        populateTerceirizadaSelects();
        populateRelatorioFilters();
        populateFuncionarioTerceirizadaFilters(); // Atualiza o filtro de funcionários
        showToast('Empresa terceirizada e funcionários associados excluídos.', 'info');
    }
}

// --- Funções para Cadastro/Edição de Funcionários (Tabela, Busca, Paginação) ---

function addOrUpdateFuncionario() {
    clearValidationMessages();
    const editId = document.getElementById('editFuncId').value;
    const empresaTerceirizadaId = document.getElementById('funcionarioTerceirizadaSelect').value;
    const nome = document.getElementById('funcionarioNome').value.trim();
    const matricula = document.getElementById('funcionarioMatricula').value.trim();

    let isValid = true;
    isValid = validateField('funcionarioTerceirizadaSelect', 'Empresa Terceirizada é obrigatória.') && isValid;
    isValid = validateField('funcionarioNome', 'Nome do funcionário é obrigatório.') && isValid;
    isValid = validateField('funcionarioMatricula', 'Matrícula é obrigatória.') && isValid;

    if (!isValid) {
        showToast('Preencha todos os campos obrigatórios.', 'error');
        return;
    }

    // Validação de duplicidade (matrícula + terceirizada)
    const isDuplicate = funcionarios.some(f => 
        f.matricula === matricula && 
        f.empresaTerceirizadaId === empresaTerceirizadaId && 
        f.id !== editId // Ignora o próprio item se for uma edição
    );

    if (isDuplicate) {
        showToast('Já existe um funcionário com esta matrícula para esta terceirizada.', 'error');
        document.getElementById('funcionarioMatricula').classList.add('field-error');
        document.querySelector('.error-message[data-field="funcionarioMatricula"]').textContent = 'Matrícula duplicada para esta terceirizada.';
        document.querySelector('.error-message[data-field="funcionarioMatricula"]').style.display = 'block';
        return;
    }

    if (editId) {
        // Edição
        const index = funcionarios.findIndex(f => f.id === editId);
        if (index !== -1) {
            funcionarios[index] = { ...funcionarios[index], empresaTerceirizadaId, nome, matricula };
            showToast('Funcionário atualizado com sucesso!', 'success');
        }
    } else {
        // Adição
        funcionarios.push({ id: 'func' + Date.now(), empresaTerceirizadaId, nome, matricula });
        showToast('Funcionário adicionado com sucesso!', 'success');
    }

    saveData();
    clearFuncionarioForm();
    searchAndFilterFuncionarios(); // Renderiza a tabela novamente com os filtros e busca aplicados
}

function clearFuncionarioForm() {
    document.getElementById('editFuncId').value = '';
    document.getElementById('funcionarioTerceirizadaSelect').value = '';
    document.getElementById('funcionarioNome').value = '';
    document.getElementById('funcionarioMatricula').value = '';
    document.getElementById('btnFuncAddEdit').textContent = 'Adicionar Funcionário';
    document.getElementById('btnFuncCancelEdit').style.display = 'none';
    clearValidationMessages();
    populateTerceirizadaSelects(); // Reseta o select da terceirizada no form de cadastro
}

function editFuncionario(id) {
    const func = funcionarios.find(f => f.id === id);
    if (func) {
        document.getElementById('editFuncId').value = func.id;
        document.getElementById('funcionarioTerceirizadaSelect').value = func.empresaTerceirizadaId;
        document.getElementById('funcionarioNome').value = func.nome;
        document.getElementById('funcionarioMatricula').value = func.matricula;
        document.getElementById('btnFuncAddEdit').textContent = 'Salvar Edição';
        document.getElementById('btnFuncCancelEdit').style.display = 'inline-block';
        clearValidationMessages();
        // Rola para o topo do acordeão para que o usuário veja o formulário de edição
        document.getElementById('abaCadastros').querySelector('.acordeao-item:nth-child(3)').scrollIntoView({ behavior: 'smooth', block: 'start' });
        showToast('Funcionário carregado para edição.', 'info');
    }
}

function cancelEditFuncionario() {
    clearFuncionarioForm();
    showToast('Edição de funcionário cancelada.', 'info');
}

function deleteFuncionario(id) {
    if (confirm('Tem certeza que deseja excluir este funcionário?')) {
        funcionarios = funcionarios.filter(f => f.id !== id);
        saveData();
        searchAndFilterFuncionarios(); // Renderiza novamente a tabela
        showToast('Funcionário excluído.', 'info');
    }
}

function populateFuncionarioTerceirizadaFilters() {
    const select = document.getElementById('filterFuncionarioTerceirizada');
    const currentValue = select.value;
    select.innerHTML = '<option value="Todos">Todas as Terceirizadas</option>';
    terceirizadas.forEach(terc => {
        const option = document.createElement('option');
        option.value = terc.id;
        option.textContent = terc.nome;
        select.appendChild(option);
    });
    if (currentValue && (currentValue === 'Todos' || terceirizadas.some(t => t.id === currentValue))) {
        select.value = currentValue;
    } else {
        select.value = 'Todos';
    }
}

function searchAndFilterFuncionarios() {
    const searchTerm = document.getElementById('searchFuncionario').value.toLowerCase();
    const filterTerceirizadaId = document.getElementById('filterFuncionarioTerceirizada').value;

    filteredFuncionarios = funcionarios.filter(func => {
        const matchesSearch = func.nome.toLowerCase().includes(searchTerm) || 
                              func.matricula.toLowerCase().includes(searchTerm);
        const matchesTerceirizada = filterTerceirizadaId === 'Todos' || func.empresaTerceirizadaId === filterTerceirizadaId;
        return matchesSearch && matchesTerceirizada;
    });

    currentPageFuncionarios = 1; // Reset para a primeira página ao aplicar novos filtros/busca
    renderFuncionariosTable(); // Renderiza a tabela com os resultados filtrados/paginados
}

function renderFuncionariosTable() {
    const tableBody = document.querySelector('#funcionariosTable tbody');
    tableBody.innerHTML = ''; // Limpa a tabela

    const startIndex = (currentPageFuncionarios - 1) * itemsPerPageFuncionarios;
    const endIndex = startIndex + itemsPerPageFuncionarios;
    const paginatedFuncionarios = filteredFuncionarios.slice(startIndex, endIndex);

    if (paginatedFuncionarios.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Nenhum funcionário encontrado.</td></tr>';
    } else {
        paginatedFuncionarios.forEach(func => {
            const terceirizadaNome = terceirizadas.find(t => t.id === func.empresaTerceirizadaId)?.nome || 'Desconhecida';
            const row = tableBody.insertRow();
            row.innerHTML = `
                <td>${func.matricula}</td>
                <td>${func.nome}</td>
                <td>${terceirizadaNome}</td>
                <td class="actions-column">
                    <button class="action-edit" onclick="editFuncionario('${func.id}')">Editar</button>
                    <button class="action-delete" onclick="deleteFuncionario('${func.id}')">Excluir</button>
                </td>
            `;
        });
    }

    updatePaginationControls();
}

function updatePaginationControls() {
    const totalPages = Math.ceil(filteredFuncionarios.length / itemsPerPageFuncionarios);
    document.getElementById('pageInfoFuncionarios').textContent = `Página ${currentPageFuncionarios} de ${totalPages || 1}`;

    // Desabilita/habilita botões de paginação
    document.querySelector('.pagination-controls button:first-child').disabled = currentPageFuncionarios === 1;
    document.querySelector('.pagination-controls button:last-child').disabled = currentPageFuncionarios === totalPages || totalPages === 0;
}


function addTarefa() {
    const nome = document.getElementById('tarefaNome').value.trim();
    const valorUnitario = parseFloat(document.getElementById('tarefaValorUnitario').value);
    if (nome && !isNaN(valorUnitario) && valorUnitario >= 0) {
        tarefas.push({ id: 'tarefa' + Date.now(), nome, valorUnitario });
        saveData();
        renderTarefas();
        document.getElementById('tarefaNome').value = '';
        document.getElementById('tarefaValorUnitario').value = '';
        populateInputTarefasSelect(); // Atualiza o select de tarefas de lançamento
        showToast('Tarefa adicionada com sucesso!', 'success');
    } else {
        showToast('Nome da tarefa e valor unitário (número positivo) são obrigatórios.', 'error');
    }
}

function renderTarefas() {
    const list = document.getElementById('tarefasList');
    list.innerHTML = '';
    tarefas.forEach(tarefa => {
        const li = document.createElement('li');
        li.innerHTML = `${tarefa.nome} (R$ ${tarefa.valorUnitario.toFixed(2).replace('.', ',')}) <button onclick="deleteTarefa('${tarefa.id}')">Excluir</button>`;
        list.appendChild(li);
    });
}

function deleteTarefa(id) {
    if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
        tarefas = tarefas.filter(t => t.id !== id);
        saveData();
        renderTarefas();
        populateInputTarefasSelect(); // Atualiza o select de tarefas de lançamento
        showToast('Tarefa excluída.', 'info');
    }
}

function addArmazem() {
    const nome = document.getElementById('armazemNome').value.trim();
    if (nome) {
        armazens.push({ id: 'armazem' + Date.now(), nome });
        saveData();
        renderArmazens();
        document.getElementById('armazemNome').value = '';
        populateArmazemSelects(); // Atualiza os selects de armazém
        showToast('Armazém adicionado com sucesso!', 'success');
    } else {
        showToast('Nome do armazém é obrigatório.', 'error');
    }
}

function renderArmazens() {
    const list = document.getElementById('armazensList');
    list.innerHTML = '';
    armazens.forEach(armazem => {
        const li = document.createElement('li');
        li.innerHTML = `${armazem.nome} <button onclick="deleteArmazem('${armazem.id}')">Excluir</button>`;
        list.appendChild(li);
    });
}

function deleteArmazem(id) {
    if (confirm('Tem certeza que deseja excluir este armazém?')) {
        armazens = armazens.filter(a => a.id !== id);
        saveData();
        renderArmazens();
        populateArmazemSelects(); // Atualiza os selects de armazém
        showToast('Armazém excluído.', 'info');
    }
}

// --- Funções de Preenchimento de Selects ---

function populateFilialSelects() {
    const selects = document.querySelectorAll('#filialSelect, #terceirizadaFilialSelect, #filterFilial, #faturamentoFilialSelect'); // faturamentoFilialSelect é renomeado
    selects.forEach(select => {
        const currentValue = select.value; // Salva o valor atual para tentar restaurar
        select.innerHTML = (select.id === 'filterFilial' || select.id === 'faturamentoFilialSelect') ? '<option value="Todos">Todos</option>' : '<option value="">Selecione a Filial</option>';
        filiais.forEach(filial => {
            const option = document.createElement('option');
            option.value = filial.id;
            option.textContent = filial.nome;
            select.appendChild(option);
        });
        if ((select.id === 'filterFilial' || select.id === 'faturamentoFilialSelect') && currentValue === 'Todos') {
            select.value = 'Todos';
        } else if (currentValue && filiais.some(f => f.id === currentValue)) {
            select.value = currentValue; // Restaura o valor se ainda existir
        }
    });
    // Força a filtragem de terceirizadas ao mudar a filial do lançamento
    filterTerceirizadasByFilial(); 
}

function populateTerceirizadaSelects() {
    const selects = document.querySelectorAll('#empresaTerceirizadaSelect, #funcionarioTerceirizadaSelect, #filterTerceirizada, #faturamentoTerceirizadaSelect'); // faturamentoTerceirizadaSelect é renomeado
    selects.forEach(select => {
        const currentValue = select.value;
        select.innerHTML = (select.id === 'filterTerceirizada' || select.id === 'faturamentoTerceirizadaSelect') ? '<option value="Todos">Todos</option>' : '<option value="">Selecione a Terceirizada</option>';
        
        // Popula apenas com terceirizadas da filial selecionada no lançamento, ou todas nos cadastros/filtros
        let terceirizadasFiltradas = [];
        if (select.id === 'empresaTerceirizadaSelect') {
            const selectedFilialId = document.getElementById('filialSelect').value;
            if (selectedFilialId) {
                terceirizadasFiltradas = terceirizadas.filter(t => t.filialId === selectedFilialId);
            }
        } else {
            terceirizadasFiltradas = terceirizadas;
        }

        terceirizadasFiltradas.forEach(terc => {
            const option = document.createElement('option');
            option.value = terc.id;
            option.textContent = terc.nome;
            select.appendChild(option);
        });
        if ((select.id === 'filterTerceirizada' || select.id === 'faturamentoTerceirizadaSelect') && currentValue === 'Todos') {
            select.value = 'Todos';
        } else if (currentValue && terceirizadas.some(t => t.id === currentValue)) {
            select.value = currentValue;
        }
    });
}

function populateArmazemSelects() {
    const select = document.getElementById('armazemSelect');
    const currentValue = select.value;
    select.innerHTML = '<option value="">Selecione o Armazém</option>';
    armazens.forEach(armazem => {
        const option = document.createElement('option');
        option.value = armazem.id;
        option.textContent = armazem.nome;
        select.appendChild(option);
    });
    if (currentValue && armazens.some(a => a.id === currentValue)) {
        select.value = currentValue;
    }
}

function filterTerceirizadasByFilial() {
    populateTerceirizadaSelects(); // Isso repopula e filtra automaticamente
    clearInputFuncionarioFields(); // Limpa campos de funcionário ao mudar a terceirizada
    // Limpar e resetar as listas de tarefas e funcionários temporárias
    currentLancamentoTarefas = [];
    currentLancamentoFuncionarios = [];
    renderCurrentLancamentoTarefas();
    renderCurrentLancamentoFuncionarios();
}

function populateInputTarefasSelect() {
    const select = document.getElementById('inputTarefaNome');
    const currentValue = select.value;
    select.innerHTML = '<option value="">Selecione a Tarefa</option>';
    tarefas.forEach(t => {
        const option = document.createElement('option');
        option.value = t.id;
        option.textContent = t.nome;
        select.appendChild(option);
    });
    if (currentValue && tarefas.some(t => t.id === currentValue)) {
        select.value = currentValue;
    }
    updateInputTarefaValor(); // Atualiza o valor unitário ao popular
}

function updateInputTarefaValor() {
    const select = document.getElementById('inputTarefaNome');
    const valorInput = document.getElementById('inputValorUnitarioTarefa');
    const selectedTarefa = tarefas.find(t => t.id === select.value);
    if (selectedTarefa) {
        valorInput.value = selectedTarefa.valorUnitario.toFixed(2);
    } else {
        valorInput.value = '0.00';
    }
    // Não chama calculateTotals aqui, pois é um campo de entrada, não um item da lista
}

function clearInputFuncionarioFields() {
    document.getElementById('inputFuncionarioMatricula').value = '';
    document.getElementById('inputFuncionarioNomeField').value = '';
    document.getElementById('inputFuncionarioIdField').value = '';
    document.getElementById('inputFuncionarioSuggestions').innerHTML = '';
    document.getElementById('inputFuncionarioSuggestions').style.display = 'none';
    clearValidationMessages(); // Limpa mensagens de erro específicas dos inputs de adição
}

// --- Funções de Lançamento de Produção ---

function addTarefaToList() {
    clearValidationMessages(); // Limpa mensagens de erro específicas dos inputs de adição
    const tarefaId = document.getElementById('inputTarefaNome').value;
    const quantidade = parseFloat(document.getElementById('inputQuantidade').value);
    const valorUnitario = parseFloat(document.getElementById('inputValorUnitarioTarefa').value);

    let isValid = true;
    isValid = validateField('inputTarefaNome', 'Tarefa é obrigatória.') && isValid;
    isValid = validateField('inputQuantidade', 'Quantidade é obrigatória e deve ser > 0.') && isValid && quantidade > 0;

    if (!isValid) {
        showToast('Preencha corretamente os campos da tarefa para adicionar.', 'error');
        return;
    }

    const tarefaObj = tarefas.find(t => t.id === tarefaId);
    if (tarefaObj) {
        currentLancamentoTarefas.push({
            id: tarefaObj.id,
            nome: tarefaObj.nome,
            quantidade: quantidade,
            valorUnitario: valorUnitario
        });
        renderCurrentLancamentoTarefas();
        
        // Limpar campos após adicionar
        document.getElementById('inputTarefaNome').value = '';
        document.getElementById('inputQuantidade').value = '';
        document.getElementById('inputValorUnitarioTarefa').value = '0.00';
        clearValidationMessages();
        showToast('Tarefa adicionada à lista!', 'success');
    } else {
        showToast('Tarefa selecionada não encontrada.', 'error');
    }
}

function removeTarefaFromList(index) {
    if (confirm('Tem certeza que deseja remover esta tarefa?')) {
        currentLancamentoTarefas.splice(index, 1);
        renderCurrentLancamentoTarefas();
        showToast('Tarefa removida.', 'info');
    }
}

function renderCurrentLancamentoTarefas() {
    const list = document.getElementById('currentLancamentoTarefasList');
    list.innerHTML = '';
    let totalProducaoTarefas = 0;

    if (currentLancamentoTarefas.length === 0) {
        list.innerHTML = '<li>Nenhuma tarefa adicionada ainda.</li>';
    } else {
        currentLancamentoTarefas.forEach((t, index) => {
            const li = document.createElement('li');
            const totalItem = t.quantidade * t.valorUnitario;
            li.innerHTML = `
                ${t.nome} (${t.quantidade} x R$ ${t.valorUnitario.toFixed(2).replace('.', ',')}) = 
                R$ ${totalItem.toFixed(2).replace('.', ',')}
                <button type="button" onclick="removeTarefaFromList(${index})">Remover</button>
            `;
            list.appendChild(li);
            totalProducaoTarefas += totalItem;
        });
    }
    document.getElementById('totalProducaoTarefas').textContent = `R$ ${totalProducaoTarefas.toFixed(2).replace('.', ',')}`;
    calculateTotals(); // Atualiza o total geral
}

function showFuncionarioSuggestionsInput() {
    const input = document.getElementById('inputFuncionarioMatricula');
    const suggestionsDiv = document.getElementById('inputFuncionarioSuggestions');
    const selectedTerceirizadaId = document.getElementById('empresaTerceirizadaSelect').value;
    const searchTerm = input.value.toLowerCase();

    suggestionsDiv.innerHTML = '';
    suggestionsDiv.style.display = 'none';

    if (!selectedTerceirizadaId) {
        suggestionsDiv.innerHTML = '<div class="suggestion-item">Selecione uma Empresa Terceirizada primeiro.</div>';
        suggestionsDiv.style.display = 'block';
        document.getElementById('inputFuncionarioNomeField').value = '';
        document.getElementById('inputFuncionarioIdField').value = '';
        return;
    }

    if (searchTerm.length < 2) { // Começa a sugerir com 2 ou mais caracteres
        return;
    }

    const relevantFuncionarios = funcionarios.filter(f => 
        f.empresaTerceirizadaId === selectedTerceirizadaId &&
        (f.nome.toLowerCase().includes(searchTerm) || f.matricula.toLowerCase().includes(searchTerm))
    );

    if (relevantFuncionarios.length > 0) {
        relevantFuncionarios.forEach(func => {
            const div = document.createElement('div');
            div.classList.add('suggestion-item');
            div.textContent = `${func.nome} (Matrícula: ${func.matricula})`;
            div.onclick = () => {
                input.value = func.matricula; // Preenche a matrícula
                document.getElementById('inputFuncionarioNomeField').value = func.nome;
                document.getElementById('inputFuncionarioIdField').value = func.id;
                suggestionsDiv.innerHTML = '';
                suggestionsDiv.style.display = 'none';
            };
            suggestionsDiv.appendChild(div);
        });
        suggestionsDiv.style.display = 'block';
    } else {
        suggestionsDiv.innerHTML = '<div class="suggestion-item">Nenhum funcionário encontrado.</div>';
        suggestionsDiv.style.display = 'block';
    }
}

function addFuncionarioToList() {
    clearValidationMessages(); // Limpa mensagens de erro específicas dos inputs de adição
    const funcionarioId = document.getElementById('inputFuncionarioIdField').value;
    const funcionarioNome = document.getElementById('inputFuncionarioNomeField').value.trim();
    const funcionarioMatricula = document.getElementById('inputFuncionarioMatricula').value.trim();
    const empresaTerceirizadaId = document.getElementById('empresaTerceirizadaSelect').value;

    let isValid = true;
    isValid = validateField('inputFuncionarioMatricula', 'Matrícula é obrigatória.') && isValid;
    isValid = validateField('inputFuncionarioNomeField', 'Selecione um funcionário válido.') && isValid;
    isValid = validateField('empresaTerceirizadaSelect', 'Empresa Terceirizada é obrigatória.') && isValid;

    if (!isValid) {
        showToast('Selecione um funcionário válido da lista de sugestões.', 'error');
        return;
    }

    // Verifica se o funcionário já foi adicionado
    const isAlreadyAdded = currentLancamentoFuncionarios.some(f => f.id === funcionarioId);
    if (isAlreadyAdded) {
        showToast('Este funcionário já foi adicionado a este lançamento.', 'warning');
        return;
    }

    const funcionarioObj = funcionarios.find(f => f.id === funcionarioId && f.empresaTerceirizadaId === empresaTerceirizadaId);
    
    if (funcionarioObj) {
        currentLancamentoFuncionarios.push({
            id: funcionarioObj.id,
            nome: funcionarioObj.nome,
            matricula: funcionarioObj.matricula,
            empresaTerceirizadaId: funcionarioObj.empresaTerceirizadaId
        });
        renderCurrentLancamentoFuncionarios();
        clearInputFuncionarioFields();
        showToast('Funcionário adicionado à lista!', 'success');
    } else {
        showToast('Funcionário não encontrado ou não pertence à terceirizada selecionada.', 'error');
    }
}

function removeFuncionarioFromList(index) {
    if (confirm('Tem certeza que deseja remover este funcionário?')) {
        currentLancamentoFuncionarios.splice(index, 1);
        renderCurrentLancamentoFuncionarios();
        showToast('Funcionário removido.', 'info');
    }
}

function renderCurrentLancamentoFuncionarios() {
    const list = document.getElementById('currentLancamentoFuncionariosList');
    list.innerHTML = '';

    if (currentLancamentoFuncionarios.length === 0) {
        list.innerHTML = '<li>Nenhum funcionário adicionado ainda.</li>';
    } else {
        currentLancamentoFuncionarios.forEach((f, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                ${f.nome} (Matrícula: ${f.matricula})
                <button type="button" onclick="removeFuncionarioFromList(${index})">Remover</button>
            `;
            list.appendChild(li);
        });
    }
}

function calculateTotals() {
    let totalProducao = 0;
    currentLancamentoTarefas.forEach(t => {
        totalProducao += t.quantidade * t.valorUnitario;
    });
    document.getElementById('totalGeralLancamento').textContent = `R$ ${totalProducao.toFixed(2).replace('.', ',')}`;
}

function registrarProducao() {
    clearValidationMessages();

    const editId = document.getElementById('editProdId').value;
    const lancamentoData = document.getElementById('lancamentoData').value;
    const filialId = document.getElementById('filialSelect').value;
    const empresaTerceirizadaId = document.getElementById('empresaTerceirizadaSelect').value;
    const armazemId = document.getElementById('armazemSelect').value;
    const turno = document.getElementById('turnoSelect').value;
    const observacoes = document.getElementById('observacoes').value.trim();

    let isValid = true;
    isValid = validateField('lancamentoData', 'Data é obrigatória.') && isValid;
    isValid = validateField('filialSelect', 'Filial é obrigatória.') && isValid;
    isValid = validateField('empresaTerceirizadaSelect', 'Empresa Terceirizada é obrigatória.') && isValid;
    isValid = validateField('armazemSelect', 'Armazém é obrigatório.') && isValid;
    isValid = validateField('turnoSelect', 'Turno é obrigatório.') && isValid;

    if (currentLancamentoTarefas.length === 0) {
        showToast('Adicione pelo menos uma tarefa ao lançamento.', 'error');
        isValid = false;
    }
    if (currentLancamentoFuncionarios.length === 0) {
        showToast('Adicione pelo menos um funcionário ao lançamento.', 'error');
        isValid = false;
    }

    if (!isValid) {
        showToast('Verifique os campos obrigatórios e as listas de tarefas/funcionários.', 'error');
        return;
    }

    const valorTotal = currentLancamentoTarefas.reduce((sum, t) => sum + (t.quantidade * t.valorUnitario), 0);

    const filialNome = filiais.find(f => f.id === filialId)?.nome || '';
    const terceirizadaNome = terceirizadas.find(t => t.id === empresaTerceirizadaId)?.nome || '';
    const armazemNome = armazens.find(a => a.id === armazemId)?.nome || '';

    if (editId) {
        // Edição de um lançamento existente
        const index = producoes.findIndex(p => p.id === editId);
        if (index !== -1) {
            producoes[index] = {
                ...producoes[index], // Mantém número e status de pagamento
                data: lancamentoData,
                filialId: filialId,
                filialNome: filialNome,
                empresaTerceirizadaId: empresaTerceirizadaId,
                empresaTerceirizadaNome: terceirizadaNome,
                armazemId: armazemId,
                armazemNome: armazemNome,
                turno: turno,
                observacoes: observacoes,
                tarefas: currentLancamentoTarefas,
                funcionariosEnvolvidos: currentLancamentoFuncionarios,
                valorTotal: valorTotal,
                dataEdicao: new Date().toISOString().split('T')[0] // Adiciona data de edição
            };
            showToast('Lançamento atualizado com sucesso!', 'success');
        }
    } else {
        // Novo lançamento
        config.lastLancamentoNumber = (config.lastLancamentoNumber || 0) + 1;
        const newLancamento = {
            id: 'prod' + Date.now(),
            numeroLancamento: config.lastLancamentoNumber,
            data: lancamentoData,
            filialId: filialId,
            filialNome: filialNome,
            empresaTerceirizadaId: empresaTerceirizadaId,
            empresaTerceirizadaNome: terceirizadaNome,
            armazemId: armazemId,
            armazemNome: armazemNome,
            turno: turno,
            observacoes: observacoes,
            tarefas: currentLancamentoTarefas,
            funcionariosEnvolvidos: currentLancamentoFuncionarios,
            valorTotal: valorTotal,
            statusPagamento: 'Pendente', // Novo campo: padrão 'Pendente'
            dataRegistro: new Date().toISOString().split('T')[0] // Data de criação
        };
        producoes.push(newLancamento);
        showToast(`Lançamento #${newLancamento.numeroLancamento} registrado com sucesso!`, 'success');
        // Habilita o botão de impressão para o novo lançamento
        const btnPrint = document.getElementById('btnImprimirComprovante');
        btnPrint.style.display = 'inline-block';
        btnPrint.dataset.lancamentoId = newLancamento.id;
    }

    saveData();
    clearLancamentoForm();
    if (currentUser === 'admin') {
        renderDashboardSummary(); // Atualiza o dashboard após o lançamento
        renderDetailedReport(); // Atualiza a tabela de relatórios
    }
}

function clearLancamentoForm() {
    document.getElementById('editProdId').value = '';
    document.getElementById('lancamentoData').valueAsDate = new Date(); // Data de hoje
    document.getElementById('filialSelect').value = '';
    document.getElementById('empresaTerceirizadaSelect').value = '';
    document.getElementById('armazemSelect').value = '';
    document.getElementById('turnoSelect').value = '';
    document.getElementById('observacoes').value = '';
    
    currentLancamentoTarefas = [];
    currentLancamentoFuncionarios = [];
    renderCurrentLancamentoTarefas();
    renderCurrentLancamentoFuncionarios();
    calculateTotals(); // Reseta o total geral
    clearInputFuncionarioFields(); // Limpa os campos de funcionário
    clearValidationMessages(); // Limpa todas as mensagens de erro

    document.getElementById('btnSalvarLancamento').textContent = 'Salvar Lançamento';
    document.getElementById('btnImprimirComprovante').style.display = 'none'; // Esconde botão de imprimir
    document.getElementById('btnImprimirComprovante').removeAttribute('data-lancamento-id');

    // Fechar todos os acordeões e abrir o primeiro
    document.querySelectorAll('#abaLancamento .acordeao-item .acordeao-header').forEach(header => {
        const content = header.nextElementSibling;
        if (header.classList.contains('active')) {
            header.classList.remove('active');
            content.classList.remove('active');
            content.style.maxHeight = null;
            content.style.paddingBottom = '0px';
        }
    });
    const firstHeader = document.querySelector('#abaLancamento .acordeao-item .acordeao-header');
    if (firstHeader) {
        firstHeader.classList.add('active');
        const firstContent = firstHeader.nextElementSibling;
        firstContent.classList.add('active');
        firstContent.style.maxHeight = firstContent.scrollHeight + 'px';
        firstContent.style.paddingBottom = '15px';
    }
}

function editLancamento(id) {
    const lancamento = producoes.find(p => p.id === id);
    if (lancamento) {
        showTab('abaLancamento'); // Vai para a aba de lançamento
        
        document.getElementById('editProdId').value = lancamento.id;
        document.getElementById('lancamentoData').value = lancamento.data;
        document.getElementById('filialSelect').value = lancamento.filialId;
        filterTerceirizadasByFilial(); // Recarrega terceirizadas com base na filial
        // Pequeno atraso para garantir que o select de terceirizadas seja populado antes de tentar selecionar
        setTimeout(() => {
            document.getElementById('empresaTerceirizadaSelect').value = lancamento.empresaTerceirizadaId;
        }, 100);
        
        document.getElementById('armazemSelect').value = lancamento.armazemId;
        document.getElementById('turnoSelect').value = lancamento.turno;
        document.getElementById('observacoes').value = lancamento.observacoes;

        currentLancamentoTarefas = JSON.parse(JSON.stringify(lancamento.tarefas)); // Copia profunda
        currentLancamentoFuncionarios = JSON.parse(JSON.stringify(lancamento.funcionariosEnvolvidos)); // Copia profunda
        renderCurrentLancamentoTarefas();
        renderCurrentLancamentoFuncionarios();
        calculateTotals();

        document.getElementById('btnSalvarLancamento').textContent = 'Atualizar Lançamento';
        const btnPrint = document.getElementById('btnImprimirComprovante');
        btnPrint.style.display = 'inline-block';
        btnPrint.dataset.lancamentoId = lancamento.id;

        // Abrir todos os acordeões para facilitar a edição
        document.querySelectorAll('#abaLancamento .acordeao-item .acordeao-header').forEach(header => {
            const content = header.nextElementSibling;
            if (!header.classList.contains('active')) {
                header.classList.add('active');
                content.classList.add('active');
                content.style.maxHeight = content.scrollHeight + 'px';
                content.style.paddingBottom = '15px';
            }
        });
        showToast('Lançamento carregado para edição.', 'info');
    }
}

function deleteLancamento(id) {
    if (confirm('Tem certeza que deseja excluir este lançamento?')) {
        producoes = producoes.filter(p => p.id !== id);
        saveData();
        renderDetailedReport(); // Atualiza a tabela de relatórios
        renderDashboardSummary(); // Atualiza o dashboard
        showToast('Lançamento excluído.', 'info');
    }
}

function printLancamentoComprovante(lancamentoId) {
    const lancamento = producoes.find(p => p.id === lancamentoId);

    if (!lancamento) {
        showToast('Lançamento não encontrado para impressão.', 'error');
        return;
    }

    const filial = filiais.find(f => f.id === lancamento.filialId);
    const terceirizada = terceirizadas.find(t => t.id === lancamento.empresaTerceirizadaId);
    const armazem = armazens.find(a => a.id === lancamento.armazemId);

    let content = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="text-align: center; color: #2c3e50;">Comprovante de Lançamento de Produção</h2>
            <p style="text-align: center; font-size: 0.9em; color: #777;">Gerado em: ${new Date().toLocaleDateString('pt-BR')}</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">

            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <p><strong>Nº Lançamento:</strong> ${String(lancamento.numeroLancamento).padStart(4, '0')} - ${lancamento.data}</p>
                <p><strong>Status:</strong> <span style="font-weight: bold; color: ${lancamento.statusPagamento === 'Pago' ? 'green' : 'orange'};">${lancamento.statusPagamento.toUpperCase()}</span></p>
                <p><strong>Filial:</strong> ${filial ? filial.nome : 'N/A'}</p>
                <p><strong>Empresa Terceirizada:</strong> ${terceirizada ? terceirizada.nome : 'N/A'}</p>
                <p><strong>Armazém:</strong> ${armazem ? armazem.nome : 'N/A'}</p>
                <p><strong>Turno:</strong> ${lancamento.turno}</p>
                <p><strong>Observações:</strong> ${lancamento.observacoes || 'N/A'}</p>
            </div>

            <h3 style="color: #2c3e50; margin-top: 20px;">Tarefas Realizadas:</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <thead>
                    <tr style="background-color: #e2e6ea;">
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Tarefa</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Qtd</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Valor Unit.</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${lancamento.tarefas.map(t => `
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd;">${t.nome}</td>
                            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${t.quantidade.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">R$ ${t.valorUnitario.toFixed(2).replace('.', ',')}</td>
                            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">R$ ${(t.quantidade * t.valorUnitario).toFixed(2).replace('.', ',')}</td>
                        </tr>
                    `).join('')}
                    <tr>
                        <td colspan="3" style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold;">Total das Tarefas:</td>
                        <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold;">R$ ${lancamento.valorTotal.toFixed(2).replace('.', ',')}</td>
                    </tr>
                </tbody>
            </table>

            <h3 style="color: #2c3e50; margin-top: 20px;">Funcionários Envolvidos:</h3>
            <ul style="list-style: none; padding: 0; margin-bottom: 20px;">
                ${lancamento.funcionariosEnvolvidos.map(f => `
                    <li style="background-color: #f0f0f0; padding: 8px 10px; margin-bottom: 5px; border-radius: 4px;">
                        ${f.nome} (Matrícula: ${f.matricula})
                    </li>
                `).join('')}
            </ul>

            <h3 style="text-align: right; color: #007bff;">VALOR TOTAL DO LANÇAMENTO: R$ ${lancamento.valorTotal.toFixed(2).replace('.', ',')}</h3>
        </div>
    `;

    // Abrir em uma nova janela para impressão
    const printWindow = window.open('', '_blank');
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
}

// --- Funções de Relatórios ---

function populateRelatorioFilters() {
    // Popula os selects de Filial e Terceirizada nos filtros de relatório
    populateFilialSelects(); // Já inclui o select de filterFilial
    populateTerceirizadaSelects(); // Já inclui o select de filterTerceirizada

    // Data inicial e final padrão (ex: último mês)
    const filterStartDateInput = document.getElementById('filterStartDate');
    const filterEndDateInput = document.getElementById('filterEndDate');
    
    if (!filterStartDateInput.value || !filterEndDateInput.value) {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        filterEndDateInput.valueAsDate = today;
        filterStartDateInput.valueAsDate = firstDayOfMonth;
    }
}

function renderDashboardSummary() {
    const totalLancamentosPendentes = producoes.filter(p => p.statusPagamento === 'Pendente').length;
    const valorTotalPendente = producoes.filter(p => p.statusPagamento === 'Pendente')
                                        .reduce((sum, p) => sum + p.valorTotal, 0);

    document.getElementById('totalLancamentosPendentes').textContent = totalLancamentosPendentes;
    document.getElementById('valorTotalPendente').textContent = `R$ ${valorTotalPendente.toFixed(2).replace('.', ',')}`;
}

function renderDetailedReport() {
    const tableBody = document.querySelector('#detailedReportTable tbody');
    tableBody.innerHTML = ''; // Limpa a tabela

    const filterStartDate = document.getElementById('filterStartDate').value;
    const filterEndDate = document.getElementById('filterEndDate').value;
    const filterFilialId = document.getElementById('filterFilial').value;
    const filterTerceirizadaId = document.getElementById('filterTerceirizada').value;
    const filterStatus = document.getElementById('filterStatus').value;

    filteredProducoes = producoes.filter(prod => {
        const prodDate = new Date(prod.data + 'T00:00:00'); // Garante que a data seja comparável sem problemas de fuso horário
        const start = filterStartDate ? new Date(filterStartDate + 'T00:00:00') : null;
        const end = filterEndDate ? new Date(filterEndDate + 'T23:59:59') : null; // Inclui o dia todo na data final

        const matchesDate = (!start || prodDate >= start) && (!end || prodDate <= end);
        const matchesFilial = filterFilialId === 'Todos' || prod.filialId === filterFilialId;
        const matchesTerceirizada = filterTerceirizadaId === 'Todos' || prod.empresaTerceirizadaId === filterTerceirizadaId;
        const matchesStatus = filterStatus === 'Todos' || prod.statusPagamento === filterStatus;

        return matchesDate && matchesFilial && matchesTerceirizada && matchesStatus;
    }).sort((a, b) => new Date(b.data) - new Date(a.data)); // Ordena por data mais recente primeiro

    currentPageRelatorios = 1; // Reset para a primeira página ao aplicar novos filtros
    renderDetailedReportTableBody(); // Renderiza a tabela com os resultados filtrados e paginados
}

function renderDetailedReportTableBody() {
    const tableBody = document.querySelector('#detailedReportTable tbody');
    tableBody.innerHTML = '';

    const startIndex = (currentPageRelatorios - 1) * itemsPerPageRelatorios;
    const endIndex = startIndex + itemsPerPageRelatorios;
    const paginatedProducoes = filteredProducoes.slice(startIndex, endIndex);

    if (paginatedProducoes.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Nenhum lançamento encontrado com os filtros aplicados.</td></tr>';
    } else {
        paginatedProducoes.forEach(prod => {
            const row = tableBody.insertRow();
            row.innerHTML = `
                <td><input type="checkbox" class="report-item-checkbox" data-id="${prod.id}"></td>
                <td>#${String(prod.numeroLancamento).padStart(4, '0')}</td>
                <td>${prod.data}</td>
                <td>${prod.filialNome}</td>
                <td>${prod.empresaTerceirizadaNome}</td>
                <td style="text-align: right;">R$ ${prod.valorTotal.toFixed(2).replace('.', ',')}</td>
                <td class="status-${prod.statusPagamento.toLowerCase()}">${prod.statusPagamento}</td>
                <td class="actions-column">
                    <button class="action-view" onclick="printLancamentoComprovante('${prod.id}')">Ver/Imprimir</button>
                    <button class="action-edit" onclick="editLancamento('${prod.id}')">Editar</button>
                    <button class="action-delete" onclick="deleteLancamento('${prod.id}')">Excluir</button>
                </td>
            `;
        });
    }
    updatePaginationControlsRelatorios();
    document.getElementById('selectAllReportItems').checked = false; // Desmarcar o "Selecionar Todos" ao renderizar
}


function updatePaginationControlsRelatorios() {
    const totalPages = Math.ceil(filteredProducoes.length / itemsPerPageRelatorios);
    document.getElementById('pageInfoRelatorios').textContent = `Página ${currentPageRelatorios} de ${totalPages || 1}`;

    const prevButton = document.querySelector('.pagination-controls button:first-child');
    const nextButton = document.querySelector('.pagination-controls button:last-child');

    prevButton.disabled = currentPageRelatorios === 1;
    nextButton.disabled = currentPageRelatorios === totalPages || totalPages === 0;
}

function goToPageRelatorios(direction) {
    const totalPages = Math.ceil(filteredProducoes.length / itemsPerPageRelatorios);
    if (direction === 'prev' && currentPageRelatorios > 1) {
        currentPageRelatorios--;
    } else if (direction === 'next' && currentPageRelatorios < totalPages) {
        currentPageRelatorios++;
    }
    renderDetailedReportTableBody();
}

function toggleSelectAllReportItems(checked) {
    document.querySelectorAll('.report-item-checkbox').forEach(checkbox => {
        checkbox.checked = checked;
    });
}

function getSelectedReportItems() {
    const selectedIds = [];
    document.querySelectorAll('.report-item-checkbox:checked').forEach(checkbox => {
        selectedIds.push(checkbox.dataset.id);
    });
    return selectedIds;
}

function markSelectedAsPaid() {
    const selectedIds = getSelectedReportItems();
    if (selectedIds.length === 0) {
        showToast('Nenhum lançamento selecionado.', 'warning');
        return;
    }

    if (confirm(`Tem certeza que deseja marcar ${selectedIds.length} lançamento(s) como PAGOS?`)) {
        selectedIds.forEach(id => {
            const index = producoes.findIndex(p => p.id === id);
            if (index !== -1) {
                producoes[index].statusPagamento = 'Pago';
            }
        });
        saveData();
        renderDetailedReport();
        renderDashboardSummary();
        showToast(`${selectedIds.length} lançamento(s) marcado(s) como Pago.`, 'success');
    }
}

function markSelectedAsPendente() {
    const selectedIds = getSelectedReportItems();
    if (selectedIds.length === 0) {
        showToast('Nenhum lançamento selecionado.', 'warning');
        return;
    }

    if (confirm(`Tem certeza que deseja marcar ${selectedIds.length} lançamento(s) como PENDENTES?`)) {
        selectedIds.forEach(id => {
            const index = producoes.findIndex(p => p.id === id);
            if (index !== -1) {
                producoes[index].statusPagamento = 'Pendente';
            }
        });
        saveData();
        renderDetailedReport();
        renderDashboardSummary();
        showToast(`${selectedIds.length} lançamento(s) marcado(s) como Pendente.`, 'success');
    }
}

function exportReportToCSV() {
    if (filteredProducoes.length === 0) {
        showToast('Nenhum dado para exportar.', 'warning');
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    // Cabeçalho CSV
    csvContent += "Numero Lancamento,Data,Filial,Empresa Terceirizada,Armazem,Turno,Observacoes,Valor Total,Status Pagamento,Funcionarios Envolvidos,Tarefas Realizadas\n";

    filteredProducoes.forEach(prod => {
        const filialNome = filiais.find(f => f.id === prod.filialId)?.nome || 'N/A';
        const terceirizadaNome = terceirizadas.find(t => t.id === prod.empresaTerceirizadaId)?.nome || 'N/A';
        const armazemNome = armazens.find(a => a.id === prod.armazemId)?.nome || 'N/A';

        const funcionariosStr = prod.funcionariosEnvolvidos.map(f => `${f.nome} (${f.matricula})`).join('; ');
        const tarefasStr = prod.tarefas.map(t => `${t.nome} (${t.quantidade} x R$ ${t.valorUnitario.toFixed(2).replace('.', ',')})`).join('; ');

        // Escapar vírgulas e aspas duplas no CSV
        const escapeCsv = (str) => {
            if (str === null || str === undefined) return '';
            str = String(str).replace(/"/g, '""');
            if (str.includes(',') || str.includes('\n') || str.includes('"')) {
                return `"${str}"`;
            }
            return str;
        };

        const row = [
            `#${String(prod.numeroLancamento).padStart(4, '0')}`,
            prod.data,
            filialNome,
            terceirizadaNome,
            armazemNome,
            prod.turno,
            prod.observacoes,
            prod.valorTotal.toFixed(2).replace('.', ','),
            prod.statusPagamento,
            escapeCsv(funcionariosStr),
            escapeCsv(tarefasStr)
        ].map(item => escapeCsv(item)).join(',');
        
        csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "relatorio_producao.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Relatório exportado para CSV!', 'success');
}

// Renomeado de populateFaturamentoSelects para populateCustoSelects
function populateCustoSelects() {
    populateFilialSelects(); // Já popula faturamentoFilialSelect
    populateTerceirizadaSelects(); // Já popula faturamentoTerceirizadaSelect
}

// Renomeado de generateFaturamentoReport para generateCustoReport
function generateCustoReport(type) {
    let reportDiv;
    let selectedId;
    let title;

    if (type === 'filial') {
        reportDiv = document.getElementById('faturamentoFilialReport'); // ID do div permanece o mesmo
        selectedId = document.getElementById('faturamentoFilialSelect').value;
        title = 'Custo por Filial: ';
    } else if (type === 'terceirizada') {
        reportDiv = document.getElementById('faturamentoTerceirizadaReport'); // ID do div permanece o mesmo
        selectedId = document.getElementById('faturamentoTerceirizadaSelect').value;
        title = 'Custo por Empresa Terceirizada: ';
    }

    reportDiv.innerHTML = ''; // Limpa o relatório anterior

    let dataToReport = producoes.filter(prod => prod.statusPagamento === 'Pago'); // Apenas lançamentos pagos para custo

    if (selectedId !== 'Todos') {
        dataToReport = dataToReport.filter(prod => {
            if (type === 'filial') return prod.filialId === selectedId;
            if (type === 'terceirizada') return prod.empresaTerceirizadaId === selectedId;
            return true;
        });
    }

    const groupedData = {};
    dataToReport.forEach(prod => {
        let key;
        let name;
        if (type === 'filial') {
            key = prod.filialId;
            name = prod.filialNome;
        } else if (type === 'terceirizada') {
            key = prod.empresaTerceirizadaId;
            name = prod.empresaTerceirizadaNome;
        }

        if (!groupedData[key]) {
            groupedData[key] = { name: name, total: 0, count: 0 };
        }
        groupedData[key].total += prod.valorTotal;
        groupedData[key].count++;
    });

    let totalGeralCusto = 0; // Renomeado de totalGeralFaturamento

    if (Object.keys(groupedData).length === 0) {
        reportDiv.innerHTML = '<p>Nenhum custo pago encontrado para esta seleção.</p>'; // Renomeado o texto
        return;
    }

    let reportHtml = `
        <table class="faturamento-table">
            <thead>
                <tr>
                    <th>${type === 'filial' ? 'Filial' : 'Empresa Terceirizada'}</th>
                    <th>Total Lançamentos Pagos</th>
                    <th>Valor do Custo</th> </tr>
            </thead>
            <tbody>
    `;

    for (const key in groupedData) {
        const item = groupedData[key];
        reportHtml += `
            <tr>
                <td>${item.name}</td>
                <td>${item.count}</td>
                <td>R$ ${item.total.toFixed(2).replace('.', ',')}</td>
            </tr>
        `;
        totalGeralCusto += item.total;
    }

    reportHtml += `
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="2" style="text-align: right; font-weight: bold;">TOTAL GERAL CUSTO:</td> <td style="font-weight: bold;">R$ ${totalGeralCusto.toFixed(2).replace('.', ',')}</td>
                </tr>
            </tfoot>
        </table>
    `;

    reportDiv.innerHTML = reportHtml;
}


// --- Inicialização ---

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    const loggedInUser = sessionStorage.getItem('loggedInUser');
    if (loggedInUser) {
        currentUser = loggedInUser;
        document.getElementById('loginScreen').classList.remove('active');
        document.getElementById('appHeader').style.display = 'block';
        applyUserPermissions();
        showTab('abaLancamento');
    } else {
        document.getElementById('loginScreen').classList.add('active');
        // Adiciona o listener de login se não estiver logado
        document.getElementById('loginForm').addEventListener('submit', login);
    }
});