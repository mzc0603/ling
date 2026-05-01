(function() {
    'use strict';

    let currentCategory = 'all';
    let currentPage = 1;
    const itemsPerPage = 20;
    let allData = [];
    let searchKeyword = '';
    let sortType = 'default';

    const categoryTitles = {
        'all': '全部内容',
        'chengyu': '成语大全',
        'tangshi': '唐诗精选',
        'songci': '宋词赏析',
        'yuanqu': '元曲鉴赏',
        'mingyan': '名人名言',
        'yanyu': '谚语俗语',
        'xiehouyu': '歇后语',
        'zhufu': '祝福语录'
    };

    const categoryTags = {
        'chengyu': '成语',
        'tangshi': '唐诗',
        'songci': '宋词',
        'yuanqu': '元曲',
        'mingyan': '名言',
        'yanyu': '谚语',
        'xiehouyu': '歇后语',
        'zhufu': '祝福语'
    };

    function init() {
        combineData();
        bindEvents();
        updateStats();
        loadFromUrl();
        renderItems(1);
        setupLazyLoading();
    }

    function combineData() {
        const chengyu = chengyuData.map(item => ({
            ...item,
            category: '成语',
            mainCategory: 'chengyu'
        }));

        const tangshi = shiciData
            .filter(item => item.category === '唐诗')
            .map(item => ({...item, mainCategory: 'tangshi'}));

        const songci = shiciData
            .filter(item => item.category === '宋词')
            .map(item => ({...item, mainCategory: 'songci'}));

        const yuanqu = shiciData
            .filter(item => item.category === '元曲')
            .map(item => ({...item, mainCategory: 'yuanqu'}));

        const mingyan = mingyanData.map(item => ({
            ...item,
            category: '名言',
            mainCategory: 'mingyan'
        }));

        const yanyu = otherData
            .filter(item => item.category === '谚语')
            .map(item => ({...item, mainCategory: 'yanyu'}));

        const xiehouyu = otherData
            .filter(item => item.category === '歇后语')
            .map(item => ({...item, mainCategory: 'xiehouyu'}));

        const zhufu = otherData
            .filter(item => item.category === '祝福语')
            .map(item => ({...item, mainCategory: 'zhufu'}));

        allData = [
            ...chengyu,
            ...tangshi,
            ...songci,
            ...yuanqu,
            ...mingyan,
            ...yanyu,
            ...xiehouyu,
            ...zhufu
        ];
    }

    function bindEvents() {
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchBtn');
        const navLinks = document.querySelectorAll('.nav-link');
        const subCategoryFilter = document.getElementById('subCategoryFilter');
        const sortFilter = document.getElementById('sortFilter');
        const backToTop = document.getElementById('backToTop');

        searchInput.addEventListener('input', debounce(handleSearch, 300));
        searchBtn.addEventListener('click', handleSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSearch();
        });

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const category = link.dataset.category;
                setCategory(category);
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            });
        });

        subCategoryFilter.addEventListener('change', handleFilterChange);
        sortFilter.addEventListener('change', handleSortChange);

        window.addEventListener('scroll', handleScroll);

        document.querySelectorAll('.footer-links a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const category = link.dataset.category;
                if (category) {
                    setCategory(category);
                    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                    const targetLink = document.querySelector(`.nav-link[data-category="${category}"]`);
                    if (targetLink) targetLink.classList.add('active');
                }
            });
        });

        window.addEventListener('popstate', handlePopState);
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    function handleSearch() {
        searchKeyword = document.getElementById('searchInput').value.trim().toLowerCase();
        currentPage = 1;
        renderItems(currentPage);
        updateUrl();
    }

    function setCategory(category) {
        currentCategory = category;
        currentPage = 1;
        searchKeyword = '';
        document.getElementById('searchInput').value = '';
        updateSubCategories();
        renderItems(currentPage);
        updateUrl();
    }

    function updateSubCategories() {
        const select = document.getElementById('subCategoryFilter');
        select.innerHTML = '<option value="">全部分类</option>';

        const subCategories = getSubCategories();
        subCategories.forEach(sub => {
            const option = document.createElement('option');
            option.value = sub;
            option.textContent = sub;
            select.appendChild(option);
        });
    }

    function getSubCategories() {
        let filtered = getFilteredData();
        const subCats = new Set();

        if (currentCategory === 'chengyu') {
            filtered.forEach(item => {
                if (item.type) subCats.add(item.type);
            });
        } else if (['tangshi', 'songci', 'yuanqu'].includes(currentCategory)) {
            filtered.forEach(item => {
                if (item.type) subCats.add(item.type);
            });
        } else if (currentCategory === 'mingyan') {
            filtered.forEach(item => {
                if (item.type) subCats.add(item.type);
            });
        } else if (['yanyu', 'xiehouyu', 'zhufu'].includes(currentCategory)) {
            filtered.forEach(item => {
                if (item.type) subCats.add(item.type);
            });
        }

        return Array.from(subCats);
    }

    function getFilteredData() {
        let filtered = allData;

        if (currentCategory !== 'all') {
            filtered = filtered.filter(item => item.mainCategory === currentCategory);
        }

        const subCategory = document.getElementById('subCategoryFilter').value;
        if (subCategory) {
            filtered = filtered.filter(item => item.type === subCategory);
        }

        if (searchKeyword) {
            filtered = filtered.filter(item => {
                const searchFields = [
                    item.title,
                    item.pinyin || '',
                    item.author || '',
                    item.dynasty || '',
                    item.explanation || item.original || item.explanation || '',
                    item.source || '',
                    item.tags ? item.tags.join(' ') : ''
                ].join(' ').toLowerCase();

                return searchFields.includes(searchKeyword);
            });
        }

        return filtered;
    }

    function getSortedData(data) {
        const sortType = document.getElementById('sortFilter').value;

        if (sortType === 'name') {
            return [...data].sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));
        } else if (sortType === 'popular') {
            return [...data].sort((a, b) => (b.popular || 0) - (a.popular || 0));
        }

        return data;
    }

    function handleFilterChange() {
        currentPage = 1;
        renderItems(currentPage);
    }

    function handleSortChange() {
        currentPage = 1;
        renderItems(currentPage);
    }

    function renderItems(page) {
        currentPage = page;
        const filtered = getFilteredData();
        const sorted = getSortedData(filtered);

        const totalItems = sorted.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageData = sorted.slice(startIndex, endIndex);

        const cardGrid = document.getElementById('cardGrid');
        const noResults = document.getElementById('noResults');
        const resultCount = document.getElementById('resultCount');
        const currentCategoryTitle = document.getElementById('currentCategoryTitle');

        resultCount.textContent = `共 ${totalItems} 条结果`;
        currentCategoryTitle.textContent = categoryTitles[currentCategory] || '全部内容';

        if (pageData.length === 0) {
            cardGrid.innerHTML = '';
            noResults.style.display = 'block';
            document.getElementById('pagination').innerHTML = '';
            return;
        }

        noResults.style.display = 'none';
        cardGrid.innerHTML = pageData.map((item, index) => createCardHTML(item, index)).join('');

        bindCardEvents();

        renderPagination(totalPages, page);

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function createCardHTML(item, index) {
        const tag = categoryTags[item.mainCategory] || item.category || '内容';
        let preview = '';
        let meta = '';

        if (item.mainCategory === 'chengyu') {
            preview = item.explanation || '';
            meta = item.pinyin ? `${item.pinyin}` : '';
        } else if (['tangshi', 'songci', 'yuanqu'].includes(item.mainCategory)) {
            preview = item.original ? item.original.substring(0, 50) + '...' : '';
            meta = item.author ? `${item.dynasty}·${item.author}` : '';
        } else if (item.mainCategory === 'mingyan') {
            preview = item.explanation || '';
            meta = item.author ? `—— ${item.author}` : '';
        } else {
            preview = item.explanation || '';
            meta = item.type || '';
        }

        const highlightedPreview = searchKeyword ?
            highlightKeyword(preview, searchKeyword) : preview;

        return `
            <article class="card" data-id="${item.id}" data-index="${index}" style="animation-delay: ${index * 0.05}s">
                <header class="card-header">
                    <h3 class="card-title">${highlightKeyword(item.title, searchKeyword)}</h3>
                    <span class="card-tag">${tag}</span>
                </header>
                ${meta ? `<p class="card-type">${meta}</p>` : ''}
                <div class="card-content">${highlightedPreview}</div>
                <footer class="card-footer">
                    <span class="card-author">点击查看详情</span>
                    <span class="card-action">阅读全文 <span class="card-expand-icon">▼</span></span>
                </footer>
            </article>
        `;
    }

    function highlightKeyword(text, keyword) {
        if (!keyword || !text) return text;
        const regex = new RegExp(`(${escapeRegExp(keyword)})`, 'gi');
        return text.replace(regex, '<span class="search-highlight">$1</span>');
    }

    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function bindCardEvents() {
        document.querySelectorAll('.card').forEach(card => {
            card.addEventListener('click', () => {
                const id = parseInt(card.dataset.id);
                const index = parseInt(card.dataset.index);
                showDetail(id, index);
            });
        });
    }

    function showDetail(id, index) {
        const filtered = getSortedData(getFilteredData());
        const item = filtered.find(i => i.id === id);

        if (!item) return;

        const modalBody = document.getElementById('modalBody');
        let html = '';

        if (item.mainCategory === 'chengyu') {
            html = createChengyuDetail(item);
        } else if (['tangshi', 'songci', 'yuanqu'].includes(item.mainCategory)) {
            html = createShiciDetail(item);
        } else if (item.mainCategory === 'mingyan') {
            html = createMingyanDetail(item);
        } else {
            html = createOtherDetail(item);
        }

        modalBody.innerHTML = html;
        document.getElementById('detailModal').classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    function createChengyuDetail(item) {
        return `
            <div class="detail-header">
                <h2 class="detail-title">${item.title}</h2>
                <div class="detail-meta">
                    <span>拼音：${item.pinyin}</span>
                    <span>分类：${item.category}</span>
                    <span>类型：${item.type}</span>
                </div>
            </div>
            <div class="detail-section">
                <h3 class="detail-section-title">释义</h3>
                <p>${item.explanation}</p>
            </div>
            ${item.source ? `
            <div class="detail-section">
                <h3 class="detail-section-title">出处</h3>
                <p>${item.source}</p>
            </div>
            ` : ''}
            ${item.example ? `
            <div class="detail-section">
                <h3 class="detail-section-title">例句</h3>
                <p>${item.example}</p>
            </div>
            ` : ''}
            ${item.tags && item.tags.length ? `
            <div class="detail-tags">
                ${item.tags.map(tag => `<span class="detail-tag">${tag}</span>`).join('')}
            </div>
            ` : ''}
        `;
    }

    function createShiciDetail(item) {
        return `
            <div class="detail-header">
                <h2 class="detail-title">${item.title}</h2>
                <div class="detail-meta">
                    <span>${item.dynasty}</span>
                    <span>作者：${item.author}</span>
                    <span>类型：${item.type}</span>
                </div>
            </div>
            <div class="detail-section">
                <h3 class="detail-section-title">原文</h3>
                <p style="font-size:1.2rem;line-height:2.2;">${item.original}</p>
            </div>
            ${item.translation ? `
            <div class="detail-section">
                <h3 class="detail-section-title">译文</h3>
                <p>${item.translation}</p>
            </div>
            ` : ''}
            ${item.appreciation ? `
            <div class="detail-section">
                <h3 class="detail-section-title">赏析</h3>
                <p>${item.appreciation}</p>
            </div>
            ` : ''}
            ${item.tags && item.tags.length ? `
            <div class="detail-tags">
                ${item.tags.map(tag => `<span class="detail-tag">${tag}</span>`).join('')}
            </div>
            ` : ''}
        `;
    }

    function createMingyanDetail(item) {
        return `
            <div class="detail-header">
                <h2 class="detail-title">${item.title}</h2>
                <div class="detail-meta">
                    ${item.author ? `<span>作者：${item.author}</span>` : ''}
                    <span>分类：${item.category}</span>
                    <span>类型：${item.type}</span>
                </div>
            </div>
            ${item.source ? `
            <div class="detail-section">
                <h3 class="detail-section-title">出处</h3>
                <p>${item.source}</p>
            </div>
            ` : ''}
            ${item.explanation ? `
            <div class="detail-section">
                <h3 class="detail-section-title">释义</h3>
                <p>${item.explanation}</p>
            </div>
            ` : ''}
            ${item.tags && item.tags.length ? `
            <div class="detail-tags">
                ${item.tags.map(tag => `<span class="detail-tag">${tag}</span>`).join('')}
            </div>
            ` : ''}
        `;
    }

    function createOtherDetail(item) {
        return `
            <div class="detail-header">
                <h2 class="detail-title">${item.title}</h2>
                <div class="detail-meta">
                    <span>分类：${item.category}</span>
                    <span>类型：${item.type}</span>
                </div>
            </div>
            ${item.explanation ? `
            <div class="detail-section">
                <h3 class="detail-section-title">解释</h3>
                <p>${item.explanation}</p>
            </div>
            ` : ''}
            ${item.tags && item.tags.length ? `
            <div class="detail-tags">
                ${item.tags.map(tag => `<span class="detail-tag">${tag}</span>`).join('')}
            </div>
            ` : ''}
        `;
    }

    function closeModal() {
        document.getElementById('detailModal').classList.remove('show');
        document.body.style.overflow = '';
    }

    function renderPagination(totalPages, currentPage) {
        const pagination = document.getElementById('pagination');

        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let html = '';

        html += `<button class="page-btn" onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>上一页</button>`;

        const maxVisible = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);

        if (endPage - startPage + 1 < maxVisible) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        if (startPage > 1) {
            html += `<button class="page-btn" onclick="goToPage(1)">1</button>`;
            if (startPage > 2) {
                html += `<span class="page-btn" style="border:none;">...</span>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                html += `<span class="page-btn" style="border:none;">...</span>`;
            }
            html += `<button class="page-btn" onclick="goToPage(${totalPages})">${totalPages}</button>`;
        }

        html += `<button class="page-btn" onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>下一页</button>`;

        pagination.innerHTML = html;
    }

    window.goToPage = function(page) {
        const filtered = getFilteredData();
        const totalPages = Math.ceil(filtered.length / itemsPerPage);

        if (page < 1 || page > totalPages) return;

        renderItems(page);
    };

    function handleScroll() {
        const backToTop = document.getElementById('backToTop');

        if (window.scrollY > 300) {
            backToTop.classList.add('show');
        } else {
            backToTop.classList.remove('show');
        }
    }

    window.scrollToTop = function() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.toggleMobileMenu = function() {
        document.getElementById('navMenu').classList.toggle('show');
    };

    window.closeModal = closeModal;

    window.onclick = function(event) {
        const modal = document.getElementById('detailModal');
        if (event.target === modal || event.target.classList.contains('modal-overlay')) {
            closeModal();
        }
    };

    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeModal();
        }
    });

    function updateStats() {
        const chengyuCount = chengyuData.length;
        const shiciCount = shiciData.length;
        const mingyanCount = mingyanData.length;
        const otherCount = otherData.length;

        animateNumber('statChengyu', chengyuCount);
        animateNumber('statShici', shiciCount);
        animateNumber('statMingyan', mingyanCount);
        animateNumber('statOther', otherCount);
    }

    function animateNumber(elementId, target) {
        const element = document.getElementById(elementId);
        const duration = 1000;
        const start = 0;
        const startTime = performance.now();

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(start + (target - start) * easeOut);

            element.textContent = current.toLocaleString();

            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                element.textContent = target.toLocaleString();
            }
        }

        requestAnimationFrame(update);
    }

    function setupLazyLoading() {
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.1 });

            document.querySelectorAll('.card').forEach(card => {
                observer.observe(card);
            });
        }
    }

    function updateUrl() {
        const params = new URLSearchParams();

        if (currentCategory !== 'all') {
            params.set('category', currentCategory);
        }

        if (searchKeyword) {
            params.set('q', searchKeyword);
        }

        if (currentPage > 1) {
            params.set('page', currentPage);
        }

        const newUrl = params.toString() ?
            `${window.location.pathname}?${params.toString()}` :
            window.location.pathname;

        history.replaceState(null, '', newUrl);
    }

    function loadFromUrl() {
        const params = new URLSearchParams(window.location.search);

        const category = params.get('category');
        if (category && categoryTitles[category]) {
            currentCategory = category;
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.toggle('active', link.dataset.category === category);
            });
            updateSubCategories();
        }

        const q = params.get('q');
        if (q) {
            searchKeyword = q;
            document.getElementById('searchInput').value = q;
        }

        const page = parseInt(params.get('page'));
        if (page && page > 1) {
            currentPage = page;
        }
    }

    function handlePopState() {
        loadFromUrl();
        renderItems(currentPage);
    }

    function getSortedData(data) {
        const sortType = document.getElementById('sortFilter').value;

        if (sortType === 'name') {
            return [...data].sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));
        } else if (sortType === 'popular') {
            return [...data].sort((a, b) => (b.popular || 0) - (a.popular || 0));
        }

        return data;
    }

    document.addEventListener('DOMContentLoaded', init);
})();