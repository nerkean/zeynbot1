const tabs = document.querySelectorAll('.profile-tab');
const tabContents = document.querySelectorAll('.profile-tab-content');
const profileStatsContainer = document.querySelector('.profile-stats');
const profileStaffStatsContainer = document.querySelector('.profile-staff-stats');
const achievementsContainer = document.querySelector('.profile-achievements');
const profileUsername = document.querySelector('.profile-username');
const profileUserId = document.querySelector('.profile-user-id');
const profileAvatar = document.querySelector('.profile-avatar');
const profileHeader = document.querySelector('.profile-header');
const shopItemsContainer = document.querySelector('.shop-items');
const errorContainer = document.getElementById('error-container');
let shopDataCache = null; // Кэш для данных магазина
let cachedUuid = null; // Кэш для uuid
let cachedProfileData = {}; // Кэш для данных профиля

const allowedRoleIds = ['1043565185509630022', '1243243180800082001', '1075072592005824563', '1043614651444899991', '1043615386660257872'];
const roleToPosition = {
    '1043615386660257872': '🐞 Хелпер',
    '1043614651444899991': '👾 Модератор',
    '1075072592005824563': '💎 Старший модератор',
    '1243243180800082001': '🔧 Тех Админ',
    '1043565185509630022': '🛠️ Админ',
};

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const tabId = tab.dataset.tab;

        if (tab.classList.contains('active')) return;

        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(content => content.classList.add('hidden'));

        tab.classList.add('active');
        document.querySelector(`.profile-tab-content[data-tab="${tabId}"]`).classList.remove('hidden');
    });
});

async function fetchProfileData(uuid) {
    if (cachedProfileData[uuid]) {
        return cachedProfileData[uuid];
    }
    try {
        const response = await fetch(`http://localhost:3000/profile/${uuid}`);
        if (!response.ok) {
            console.error("Ошибка при получении данных профиля:", response.status, response.statusText);
            throw new Error('Ошибка при получении данных');
        }
        const data = await response.json();
        console.log("Полученные данные:", data)
        cachedProfileData[uuid] = data;
        return data;
    } catch (error) {
        console.error(error);
        return {};
    }
}

async function fetchAchievementsData(uuid) {
    try {
        const response = await fetch(`http://localhost:3000/achievements/${uuid}`);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ошибка при получении данных об ачивках: ${response.status} ${response.statusText} - ${errorText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(error);
        throw error;
    }
}

function isMessagesTabActive() {
    return document.querySelector('.profile-tab[data-tab="stats"]').classList.contains('active');
}

function displayProfileData(data) {
    if (!data || Object.keys(data).length === 0) return;

    if (data.userAvatar) {
        profileAvatar.src = `http://localhost:3000/avatars/${data.userId}/${data.userAvatar}.webp`;
        profileAvatar.style.display = 'block';
    } else {
        profileAvatar.style.display = 'none';   
    }
    profileUsername.textContent = `Добро пожаловать, ${data.username}!`;

    profileUserId.textContent = `ID: ${data.userId}`;

    let highestUserPosition = '';
    let highestRoleId = '';
    if (data.roles && data.roles.length > 0) {
        for (const roleId of allowedRoleIds) {
            if (data.roles.includes(roleId)) {
                highestUserPosition = roleToPosition[roleId];
                highestRoleId = roleId;
                break;
            }
        }
    }

    let positionElement = document.querySelector('.profile-user-position');
    if (!positionElement) {
        positionElement = document.createElement('p');
        positionElement.classList.add('profile-user-position');
        profileHeader.appendChild(positionElement);
    }

    if (highestUserPosition) {
        positionElement.textContent = highestUserPosition;
        positionElement.style.display = 'block';

        if (highestRoleId === '1243243180800082001') {
            positionElement.classList.add('tech-admin');
        } else {
            positionElement.classList.remove('tech-admin');
        }

    } else {
        positionElement.style.display = 'none';
    }

    const statsBlocks = [
        { name: 'Баланс', value: `${data.stars.toFixed(2)} ⭐` },
        { name: 'Буст', value: data.activeStarBoost && data.activeStarBoost.expiresAt > Date.now() ? `+${data.activeStarBoost.percentage}% (до ${new Date(data.activeStarBoost.expiresAt).toLocaleTimeString('ru-RU')})` : 'Нет' },
        {
            name: 'Сообщения', value: [
                { period: 'За все время', count: data.totalMessages },
                { period: 'За 24 часа', count: data.messagesToday },
                { period: 'За 7 дней', count: data.messagesLast7Days, average: (data.messagesLast7Days / 7).toFixed(0) },
                { period: 'За 30 дней', count: data.messagesLast30Days, average: (data.messagesLast30Days / 30).toFixed(0) }
            ],
        },
        { name: 'Мьюты', value: data.totalMuteCount },
        {
            name: 'Лутбоксы', value: [
                { type: 'Всего', count: data.totalLootboxCount },
                { type: 'Обычные', count: data.regularLootboxCount },
                { type: 'Эпические', count: data.epicLootboxCount },
                { type: 'Легендарные', count: data.legendaryLootboxCount }
            ]
        },
        {
            name: 'Место в рейтинге', value: [
                { period: 'За всё время', rank: data.userRankAllTime },
                { period: 'За 24 часа', rank: data.userRankToday },
                { period: 'За 7 дней', rank: data.userRankLast7Days },
                { period: 'За 30 дней', rank: data.userRankLast30Days }
            ]
        }
    ];

    profileStatsContainer.innerHTML = '';
    profileStaffStatsContainer.innerHTML = '';

    // Оптимизируем создание элементов статистики
    requestAnimationFrame(() => {
        statsBlocks.forEach(block => {
            const blockElement = document.createElement('div');
            blockElement.classList.add('profile-stat-block');

            const nameElement = document.createElement('div');
            nameElement.classList.add('profile-stat-name');
            nameElement.textContent = block.name;
            blockElement.appendChild(nameElement);

            const valueElement = document.createElement('div');
            valueElement.classList.add('profile-stat-value');

            if (Array.isArray(block.value)) {
                let values = block.value.map(item => {
                    if (item.period) {
                        let text = `${item.period}: ${item.count || item.rank}`;
                        if (item.average) {
                            text += ` (в среднем ${item.average})`;
                        }
                        return text;
                    } else if (item.type) {
                        return `${item.type}: ${item.count}`;
                    }
                    return '';
                }).join('<br>');

                valueElement.innerHTML = values;

                if (block.name === 'Сообщения') {
                    block.value.forEach((item) => {
                        if (['За все время', 'За 7 дней', 'За 30 дней'].includes(item.period)) {
                            valueElement.style.cursor = 'pointer';
                            valueElement.style.color = '#00FFFF';
                            valueElement.addEventListener('click', () => displayMessagesChart(data.userId, item.period === 'За все время' ? 'all' : item.period === 'За 7 дней' ? '7days' : '30days'));
                        }
                    });
                }
            } else {
                valueElement.textContent = block.value;
            }

            blockElement.appendChild(valueElement);
            profileStatsContainer.appendChild(blockElement);
        });

        if (allowedRoleIds.some(roleId => data.roleAcquisitionDates && data.roleAcquisitionDates.hasOwnProperty(roleId))) {
            const staffStatsBlocks = [
                {
                    name: 'Использование команд', value: [
                        { period: 'За все время', stats: `Мьютов: ${data.muteCount}, Размьютов: ${data.unmuteCount}, Киков: ${data.kickCount}, Банов: ${data.banCount}, Разбанов: ${data.unbanCount}` },
                        { period: 'За 24 часа', stats: `Мьютов: ${data.muteCountToday}, Размьютов: ${data.unmuteCountToday}` },
                        { period: 'За 7 дней', stats: `Мьютов: ${data.muteCountLast7Days}, Размьютов: ${data.unmuteCountLast7Days}, Киков: ${data.kickCountLast7Days}, Банов: ${data.banCountLast7Days}, Разбанов: ${data.unbanCountLast7Days}` },
                        { period: 'За 30 дней', stats: `Мьютов: ${data.muteCountLast30Days}, Размьютов: ${data.unmuteCountLast30Days}, Киков: ${data.kickCountLast30Days}, Банов: ${data.banCountLast30Days}, Разбанов: ${data.unbanCountLast30Days}` }
                    ]
                },
                {
                    name: 'Полученные номинации', value: [
                        { period: 'За все время', count: data.nominationCount },
                        { period: 'Ежедневных по сообщениям', count: data.nominationCountTodayByMessages },
                        { period: 'Еженедельных по сообщениям', count: data.nominationCountWeekByMessages },
                        { period: 'Ежемесячных по сообщениям', count: data.nominationCountMonthByMessages },
                        { period: 'Ежедневных по мьютам', count: data.nominationCountTodayByMutes },
                        { period: 'Еженедельных по мьютам', count: data.nominationCountWeekByMutes },
                        { period: 'Ежемесячных по мьютам', count: data.nominationCountMonthByMutes }
                    ]
                }
            ];

            staffStatsBlocks.forEach(block => {
                const blockElement = document.createElement('div');
                blockElement.classList.add('profile-stat-block');

                const nameElement = document.createElement('div');
                nameElement.classList.add('profile-stat-name');
                nameElement.textContent = block.name;
                blockElement.appendChild(nameElement);

                if (Array.isArray(block.value)) {
                    block.value.forEach(item => {
                        const valueElement = document.createElement('div');
                        valueElement.classList.add('profile-stat-value');
                        valueElement.textContent = item.stats ? `${item.period}: ${item.stats}` : `${item.period}: ${item.count}`;
                        blockElement.appendChild(valueElement);
                    });
                }

                profileStaffStatsContainer.appendChild(blockElement);
            });
        }
    });
}

function displayAchievementsData(achievements) {
    if (!achievementsContainer) return;
    achievementsContainer.innerHTML = '';

    achievements.forEach(achievement => {
        const achievementElement = document.createElement('div');
        achievementElement.classList.add('profile-achievement');

        const nameElement = document.createElement('div');
        nameElement.classList.add('profile-achievement-name');
        nameElement.textContent = achievement.description;
        achievementElement.appendChild(nameElement);

        const descriptionElement = document.createElement('div');
        descriptionElement.classList.add('profile-achievement-description');
        achievementElement.appendChild(descriptionElement);

        if (achievement.name === 'message_master' || achievement.name === 'voice_time_10s') {
            const progressContainer = document.createElement('div');
            progressContainer.classList.add('progress-bar-container');
            achievementElement.appendChild(progressContainer);

            const progressBar = document.createElement('div');
            progressBar.classList.add('progress-bar');
            const percentage = achievement.target ? (achievement.progress / achievement.target) * 100 : 0;
            progressBar.style.width = `${percentage}%`;
            progressContainer.appendChild(progressBar);

            const messageCount = document.createElement('div');
            messageCount.classList.add('message-count');
            messageCount.textContent = `${achievement.progress}/${achievement.target}`;
            achievementElement.appendChild(messageCount);
        }

        if (achievement.completed) {
            nameElement.classList.add('completed');
            const checkmark = document.createElement('span');
            checkmark.classList.add('checkmark');
            checkmark.textContent = '✔';
            achievementElement.appendChild(checkmark);
        }

        achievementsContainer.appendChild(achievementElement);
    });
}

async function fetchLeaderboardData(sortBy) {
    try {
        const response = await fetch(`http://localhost:3000/leaderboard?sortBy=${sortBy}`)
        if (!response.ok) {
            throw new Error('Ошибка при получении данных для таблицы лидеров');
        }

        const { data, nextUpdateIn } = await response.json();
        startCountdown(nextUpdateIn);
        return data;
    } catch (error) {
        console.error(error);
    }
}

async function fetchMessagesByDate(uuid) {
    try {
        const response = await fetch(`http://localhost:3000/profile/${uuid}/messagesByDate`);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ошибка при получении данных о сообщениях по дням: ${response.status} ${response.statusText} - ${errorText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

async function fetchShopData() {
    if (shopDataCache) {
        return shopDataCache;
    }
    try {
        const response = await fetch(`http://localhost:3000/shop`);
        if (!response.ok) {
            throw new Error('Ошибка при получении данных магазина');
        }
        const data = await response.json();
        shopDataCache = data;
        return data;
    } catch (error) {
        console.error(error);
        return null;
    }
}

async function displayShopData(uuid) {
    if (!uuid) {
        console.error("Ошибка: uuid не определён");
        return;
    }

    const shopData = await fetchShopData();
    if (!shopData) return;

    // Очищаем контейнер только если он не пустой
    if (shopItemsContainer.firstChild) {
        shopItemsContainer.innerHTML = '';
    }

    const profileData = await fetchProfileData(uuid);
    if (!profileData || !profileData.roles) {
        console.error("Ошибка: не удалось получить данные о ролях пользователя.");
        return;
    }
    const userStars = profileData.stars;

    const today = new Date();
    const isWeekend = today.getDay() === 6 || today.getDay() === 0;

    const hasDiscountRole = profileData.roles.includes('1260383669839724634');

    const discountInfoContainer = document.querySelector('.shop-discount-info');
    discountInfoContainer.innerHTML = '';

    if (hasDiscountRole || isWeekend) {
        const discountInfoElement = document.createElement('div');
        let discountReasonText = '';
        if (hasDiscountRole) {
            discountReasonText += 'У вас есть роль, дающая скидку 20%!<br>';
        }
        if (isWeekend) {
            discountReasonText += 'В выходные дни действует скидка 5%!';
        }
        discountInfoElement.innerHTML = discountReasonText;
        discountInfoContainer.appendChild(discountInfoElement);
    }

    shopData.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.classList.add('shop-item');

        const nameElement = document.createElement('div');
        nameElement.classList.add('shop-item-name');
        nameElement.textContent = item.name;
        itemElement.appendChild(nameElement);

        const priceElement = document.createElement('div');
        priceElement.classList.add('shop-item-price');
        let originalPrice = item.price;
        let discountedPrice = originalPrice;
        if (hasDiscountRole) {
            discountedPrice = Math.round(originalPrice * (1 - 20 / 100));
        }

        if (isWeekend) {
            discountedPrice = Math.round(discountedPrice * (1 - 0.05));
        }

        if (hasDiscountRole || isWeekend) {
            priceElement.innerHTML = `<span class="strike">Цена: ${originalPrice} ⭐</span>`;

            const newPriceElement = document.createElement('span');
            newPriceElement.classList.add('new-price');
            newPriceElement.textContent = ` ${discountedPrice} ⭐`;
            priceElement.appendChild(newPriceElement);

        } else {
            priceElement.textContent = `Цена: ${originalPrice} ⭐`;
        }

        itemElement.appendChild(priceElement);

        const stockElement = document.createElement('div');
        stockElement.classList.add('shop-item-stock');
        stockElement.textContent = `В наличии: ${item.stock === -1 ? '∞' : item.stock} шт.`;
        itemElement.appendChild(stockElement);

        itemElement.appendChild(priceElement);
        itemElement.appendChild(stockElement);

        const buySection = document.createElement('div');
        buySection.classList.add('buy-section');
        itemElement.appendChild(buySection);

        const buyButton = document.createElement('button');
        buyButton.classList.add('shop-item-buy-button');
        buyButton.textContent = 'Купить';
        buyButton.disabled = userStars < discountedPrice;
        buyButton.addEventListener('click', () => buyItem(uuid, item.name, quantity));

        const quantityControls = document.createElement('div');
        quantityControls.classList.add('quantity-controls');

        const minusButton = document.createElement('button');
        minusButton.classList.add('quantity-button');
        minusButton.textContent = '-';
        quantityControls.appendChild(minusButton);

        const quantityValue = document.createElement('span');
        quantityValue.classList.add('quantity-value');
        quantityValue.textContent = '1';
        quantityControls.appendChild(quantityValue);

        const plusButton = document.createElement('button');
        plusButton.classList.add('quantity-button');
        plusButton.textContent = '+';
        quantityControls.appendChild(plusButton);

        buySection.appendChild(buyButton);
        buySection.appendChild(quantityControls);

        let quantity = 1;

        function updateQuantity(newQuantity) {
            quantity = newQuantity;
            quantityValue.textContent = quantity;

            buyButton.disabled = userStars < discountedPrice * quantity || (item.stock !== -1 && item.stock < quantity);
        }

        minusButton.addEventListener('click', () => {
            updateQuantity(Math.max(1, quantity - 1));
        });

        plusButton.addEventListener('click', () => {
            updateQuantity(quantity + 1);
        });

        itemElement.appendChild(buySection);
        shopItemsContainer.appendChild(itemElement);
    });
}

async function buyItem(uuid, itemName, quantity) {
    try {
        let userId = localStorage.getItem('userId');

        if (!userId) {
            const profileData = await fetchProfileData(uuid);
            userId = profileData.userId;
            localStorage.setItem('userId', userId);
        }

        const response = await fetch('http://localhost:3000/buy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ uuid, userId, itemName, quantity }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Ошибка при покупке товара');
        }

        const data = await response.json();
        console.log(data.message);
        alert(data.message);

        // Сбрасываем кэш данных профиля, чтобы при следующем запросе данные снова загрузились с сервера
        cachedProfileData[uuid] = null;

        const updatedProfileData = await fetchProfileData(uuid);
        displayProfileData(updatedProfileData);

        // Обновляем данные магазина после покупки
        shopDataCache = null;
        await displayShopData(uuid);
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

function displayLeaderboardData(data, tableId) {
    const leaderboardTableBody = document.querySelector(`#${tableId} tbody`);
    leaderboardTableBody.innerHTML = '';

    data.forEach((user, index) => {
        const row = document.createElement('tr');

        const rankCell = document.createElement('td');
        rankCell.textContent = index + 1;
        row.appendChild(rankCell);

        const usernameCell = document.createElement('td');
        usernameCell.textContent = user.username;
        row.appendChild(usernameCell);

        if (user.username === 'pillonmymind') {
            usernameCell.classList.add('easter-egg');
            usernameCell.addEventListener('click', () => {
                showEasterEgg();
            });
        }

        const valueCell = document.createElement('td');
        if (tableId === 'voice-leaderboard') {
            valueCell.textContent = formatVoiceTime(user.voiceTime);
        } else if (tableId === 'stars-leaderboard') {
            valueCell.textContent = `${Math.round(user.stars)} ⭐`;
        } else if (tableId === 'messages-leaderboard') {
            valueCell.textContent = user.totalMessages;
        }
        row.appendChild(valueCell);

        leaderboardTableBody.appendChild(row);
    });
}

function showEasterEgg() {
    const easterEggOverlay = document.createElement('div');
    easterEggOverlay.classList.add('easter-egg-overlay');
    easterEggOverlay.textContent = 'лох';

    document.body.appendChild(easterEggOverlay);

    setTimeout(() => {
        easterEggOverlay.remove();
    }, 3000);
}

function formatVoiceTime(seconds) {
    if (seconds === undefined || seconds === null) {
        return '0 сек';
    }

    const totalSeconds = Math.floor(seconds);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    let result = '';
    if (days > 0) {
        result += `${days} д `;
    }
    if (hours > 0) {
        result += `${hours} ч `;
    }
    if (minutes > 0) {
        result += `${minutes} мин `;
    }

    return result.trim();
}

async function initializeLeaderboards() {
    const voiceLeaderboardData = await fetchLeaderboardData('voiceTime');
    displayLeaderboardData(voiceLeaderboardData, 'voice-leaderboard');

    const starsLeaderboardData = await fetchLeaderboardData('stars');
    displayLeaderboardData(starsLeaderboardData, 'stars-leaderboard');

    const messagesLeaderboardData = await fetchLeaderboardData('messages');
    displayLeaderboardData(messagesLeaderboardData, 'messages-leaderboard');
}

let shopTabLastClicked = 0;

tabs.forEach(tab => {
    tab.addEventListener('click', async () => {
        const tabId = tab.dataset.tab;

        if (tabId === 'shop') {
            const now = Date.now();
            if (now - shopTabLastClicked < 5000) {
                console.log('Пожалуйста, подождите 5 секунд перед повторным открытием магазина.');
                return;
            }
            shopTabLastClicked = now;

            tab.classList.add('disabled');
            setTimeout(() => {
                tab.classList.remove('disabled');
            }, 5000);

            let uuid = localStorage.getItem('uuid');
            if (!uuid) {
                const searchParams = new URLSearchParams(window.location.search);
                uuid = searchParams.get('uuid');
                if (uuid) {
                    localStorage.setItem('uuid', uuid);
                }
            }

            if (uuid) {
                console.log("Отображаем магазин для uuid:", uuid);
                cachedUuid = uuid;
                await displayShopData(uuid);
            } else {
                console.error("Ошибка: uuid не определён при переключении на вкладку Магазин");
            }
        }
    });
});

function checkDataLoading(data, loadingTimeout) {
    if (!data || Object.keys(data).length === 0) {
        if (errorContainer) {
            errorContainer.textContent = 'Данные не загрузились. Убедитесь, что у вас есть профиль: используйте на сервере команду /mrank. Также проверьте подключение к интернету';
            errorContainer.style.textAlign = 'center';
            errorContainer.style.marginTop = '10px';
        }
    } else {
        if (errorContainer) {
            errorContainer.textContent = '';
        }
        clearTimeout(loadingTimeout);
    }
}

async function main() {
    try {

        
        let uuid = localStorage.getItem('uuid');

        if (!uuid) {
            const searchParams = new URLSearchParams(window.location.search);
            uuid = searchParams.get('uuid');
            if (uuid) {
                localStorage.setItem('uuid', uuid);
            }
        }

        console.log(
            `%cЗдравствуйте!`,
            `color: #2f68dc; font-size: 6em; font-weight: bold; text-shadow: 0 0 2px #0d2f63;`
        );
        console.log(
            `%cДобро пожаловать на мой сайт! Настоятельно рекомендуем Вам ничего не изменять в хранилище и не вводить никаких команд в консоли. Такие действия могут привести к несанкционированному доступу к Вашему аккаунту, в том числе к возможности совершать покупки без Вашего согласия.`,
            `font-size: 1.5em;`
        );

        const loadingTimeout = setTimeout(() => {
            checkDataLoading({}, loadingTimeout);
        }, 30000);

        if (uuid) {
            const profileData = await fetchProfileData(uuid);

            checkDataLoading(profileData, loadingTimeout);

            displayProfileData(profileData);

            const achievementsData = await fetchAchievementsData(uuid);
            displayAchievementsData(achievementsData);

            const loginButton = document.querySelector('.discord-login');
            if (loginButton) {
                loginButton.classList.add('hidden');
            }

            const logoutButton = document.querySelector('.logout-button');
            logoutButton.style.display = 'block';
            logoutButton.addEventListener('click', logout);

        } else {
            showLoginButton();
            const logoutButton = document.querySelector('.logout-button');
            logoutButton.style.display = 'none';
        }
        initializeLeaderboards();
    } catch (error) {
        console.error("Ошибка при получении ачивок:", error);
        achievementsContainer.innerHTML = '<div style="color: white">Не удалось загрузить достижения</div>';
    }
}

function logout() {
    localStorage.removeItem('uuid');
    localStorage.removeItem('userId');
    console.log("Выход из аккаунта");
    shopDataCache = null; // Очищаем кэш данных магазина
    cachedProfileData = {}; // Очищаем кэш данных профиля
    window.location.href = 'http://127.0.0.1:5500/index.html';
}

function showLoginButton() {
    profileStatsContainer.innerHTML = '';
    profileStaffStatsContainer.innerHTML = '';
    achievementsContainer.innerHTML = '';

    const loginButton = document.querySelector('.discord-login');
    loginButton.style.display = 'flex'; 

    loginButton.onclick = () => {
        window.location.href = 'http://localhost:3000/auth/discord';
    };
}

function showError(message) {
    profileStatsContainer.innerHTML = '';
    profileStaffStatsContainer.innerHTML = '';
    achievementsContainer.innerHTML = `<div style="color: white">${message}</div>`;
}

main();

function createMessagesChart(data, label, days) {
    let chartCanvas = document.getElementById('messagesChart');
    let existingChart = Chart.getChart(chartCanvas);

    // Проверяем, существует ли уже canvas
    if (!chartCanvas) {
        // Если canvas не существует, создаем его
        chartCanvas = document.createElement('canvas');
        chartCanvas.id = 'messagesChart';
        chartCanvas.width = 400;
        chartCanvas.height = 200;

        // Добавляем canvas в нужное место в DOM
        const profileTabContent = document.querySelector('.profile-tab-content[data-tab="stats"]');
        profileTabContent.appendChild(chartCanvas);
        
    } else if (existingChart) {
        existingChart.destroy();
    }

    const ctx = chartCanvas.getContext('2d');
    const labels = Object.keys(data).slice(-days);
    const values = Object.values(data).slice(-days);

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: values,
                backgroundColor: 'rgba(0, 255, 255, 0.2)',
                borderColor: 'rgba(0, 255, 255, 1)',
                borderWidth: 3,
                tension: 0.4,
                pointRadius: 3,
                pointBackgroundColor: 'rgba(0, 255, 255, 1)'
            }]
        },
        options: {
            color: '#fff',
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#fff'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.2)'
                    }
                },
                x: {
                    ticks: {
                        color: '#fff'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.2)'
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#fff'
                    }
                }
            }
        }
    });
}

async function displayMessagesChart(userId, period) {
    showStatsContent(false); // Скрываем контент перед отображением графика
    const messagesByDate = await fetchMessagesByDate(userId);
    if (!messagesByDate) return;

    let label = '';
    let days = 0;

    if (period === 'all') {
        label = 'Сообщения за все время';
        days = Object.keys(messagesByDate).length;
    } else if (period === '7days') {
        label = 'Сообщения за последние 7 дней';
        days = 7;
    } else if (period === '30days') {
        label = 'Сообщения за последние 30 дней';
        days = 30;
    }

    createMessagesChart(messagesByDate, label, days);
}

function showStatsContent(show) {
    const statsContent = document.querySelector('.profile-stats');
    const staffStatsContent = document.querySelector('.profile-staff-stats');
    let chartCanvas = document.getElementById('messagesChart');
    const backButton = document.getElementById('backButton');
    const profileTabContent = document.querySelector('.profile-tab-content[data-tab="stats"]');

    if (show) {
        statsContent.style.display = 'block';
        staffStatsContent.style.display = 'block';
        if (chartCanvas) chartCanvas.style.display = 'none';
        if (backButton) backButton.remove();
    } else {
        statsContent.style.display = 'none';
        staffStatsContent.style.display = 'none';

        if (!backButton) {
            const newBackButton = document.createElement('button');
            newBackButton.id = 'backButton';
            newBackButton.textContent = 'Назад';
            profileTabContent.appendChild(newBackButton);
            newBackButton.addEventListener('click', () => showStatsContent(true));
        }

        if (!chartCanvas) {
            chartCanvas = document.createElement('canvas');
            chartCanvas.id = 'messagesChart';
            chartCanvas.width = 400;
            chartCanvas.height = 200;
            profileTabContent.insertBefore(chartCanvas, document.getElementById('backButton'));
        }

        chartCanvas.style.display = 'block';
    }
}

function startCountdown(milliseconds) {
    const countdownElement = document.getElementById('countdown');
    let timeLeft = milliseconds / 1000;

    const interval = setInterval(() => {
        if (timeLeft <= 0) {
            clearInterval(interval);
            countdownElement.textContent = 'Обновление...';
            return;
        }

        const minutes = Math.floor(timeLeft / 60);
        const seconds = Math.floor(timeLeft % 60);
        countdownElement.textContent = `Обновление данных через: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        timeLeft -= 1;
    }, 1000);
}
