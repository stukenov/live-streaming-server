document.addEventListener('DOMContentLoaded', function() {
  // DOM элементы
  const videoPlayer = document.getElementById('videoPlayer');
  const playOverlay = document.getElementById('playOverlay');
  const bufferIndicator = document.getElementById('bufferIndicator');
  const toastContainer = document.getElementById('toastContainer');
  const qualityIndicator = document.getElementById('qualityIndicator');
  const qualityText = document.getElementById('qualityText');
  const streamStatus = document.getElementById('streamStatus');
  
  // Состояние плеера
  let retryCount = 0;
  const MAX_RETRIES = 5;
  const RETRY_DELAY = 3000;
  let isPlaying = false;
  let bufferingTimeout = null;
  let networkRecoveryTimer = null;
  let toastTimeouts = {};
  let currentQuality = 'auto';
  let lastActivity = Date.now();
  let userInactive = false;
  let connectionQuality = 'good';
  let controlsVisible = true;
  let controlsTimeout = null;
  
  // Функция для показа/скрытия индикатора буферизации
  function toggleBufferIndicator(show) {
    bufferIndicator.style.display = show ? 'block' : 'none';
    
    // Обновляем статус трансляции
    if (show) {
      streamStatus.textContent = 'Буферизация...';
      document.querySelector('.status-indicator').style.backgroundColor = '#FFC107';
    } else if (isPlaying && !videoPlayer.paused) {
      streamStatus.textContent = 'В эфире';
      document.querySelector('.status-indicator').style.backgroundColor = '#4CAF50';
    }
  }
  
  // Функция для создания и показа уведомлений
  function showToast(message, type = 'info', duration = 5000, withAction = null) {
    // Удаляем предыдущие уведомления того же типа
    const existingToasts = document.querySelectorAll(`.toast-message.${type}`);
    existingToasts.forEach(toast => {
      const toastId = toast.getAttribute('data-toast-id');
      if (toastId && toastTimeouts[toastId]) {
        clearTimeout(toastTimeouts[toastId]);
        delete toastTimeouts[toastId];
      }
      toast.remove();
    });
    
    const toastId = Date.now().toString();
    const toast = document.createElement('div');
    toast.className = `toast-message ${type}`;
    toast.setAttribute('data-toast-id', toastId);
    
    // Добавляем иконку в зависимости от типа уведомления
    let iconHtml = '';
    if (type === 'error') {
      iconHtml = '<span class="toast-icon">⚠️</span>';
    } else if (type === 'success') {
      iconHtml = '<span class="toast-icon">✓</span>';
    } else if (type === 'warning') {
      iconHtml = '<span class="toast-icon">⚠</span>';
    } else {
      iconHtml = '<span class="toast-icon">ℹ</span>';
    }
    
    let actionHtml = '';
    if (withAction) {
      actionHtml = `<button class="reconnect-button"><span class="reconnect-icon">↻</span>${withAction.text}</button>`;
    }
    
    toast.innerHTML = `
      ${iconHtml}
      <span>${message}</span>
      <span class="toast-close">×</span>
      ${actionHtml}
    `;
    
    toastContainer.appendChild(toast);
    
    // Анимация появления
    setTimeout(() => {
      toast.classList.add('visible');
    }, 10);
    
    // Обработчик закрытия
    toast.querySelector('.toast-close').addEventListener('click', () => {
      closeToast(toast, toastId);
    });
    
    // Обработчик действия, если есть
    if (withAction) {
      toast.querySelector('.reconnect-button').addEventListener('click', () => {
        withAction.callback();
        closeToast(toast, toastId);
      });
    }
    
    // Автоматическое закрытие через указанное время
    if (duration > 0) {
      toastTimeouts[toastId] = setTimeout(() => {
        closeToast(toast, toastId);
      }, duration);
    }
    
    return toastId;
  }
  
  // Функция для закрытия уведомления
  function closeToast(toast, toastId) {
    toast.classList.remove('visible');
    
    // Удаляем элемент после завершения анимации
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      
      // Очищаем таймер
      if (toastTimeouts[toastId]) {
        clearTimeout(toastTimeouts[toastId]);
        delete toastTimeouts[toastId];
      }
    }, 300);
  }
  
  // Функция для обновления индикатора качества
  function updateQualityIndicator(quality) {
    currentQuality = quality;
    
    if (quality === 'high' || quality === 'auto') {
      qualityText.textContent = 'Высокое качество';
      document.querySelector('.quality-indicator-icon').textContent = 'HD';
    } else if (quality === 'medium') {
      qualityText.textContent = 'Среднее качество';
      document.querySelector('.quality-indicator-icon').textContent = 'SD';
    } else if (quality === 'low') {
      qualityText.textContent = 'Низкое качество';
      document.querySelector('.quality-indicator-icon').textContent = 'LD';
    }
    
    qualityIndicator.classList.add('visible');
    
    // Скрываем индикатор через 3 секунды
    setTimeout(() => {
      qualityIndicator.classList.remove('visible');
    }, 3000);
  }

  // Функция для отображения/скрытия сообщения об ошибке
  function toggleErrorMessage(show, message) {
    if (show) {
      showToast(message, 'error', 0, {
        text: 'Перезапустить',
        callback: restartPlayback
      });
    }
  }

  // Функция для перезапуска воспроизведения
  function restartPlayback() {
    console.log(`Попытка перезапуска потока... (${retryCount + 1}/${MAX_RETRIES})`);
    
    if (retryCount >= MAX_RETRIES) {
      console.error('Превышено максимальное количество попыток перезапуска');
      showToast('Не удалось восстановить воспроизведение. Пожалуйста, обновите страницу.', 'error', 0, {
        text: 'Обновить',
        callback: () => window.location.reload()
      });
      toggleBufferIndicator(false);
      streamStatus.textContent = 'Ошибка подключения';
      document.querySelector('.status-indicator').style.backgroundColor = '#DC3545';
      return;
    }
    
    retryCount++;
    toggleBufferIndicator(true);
    
    // Показываем уведомление о перезапуске
    showToast(`Восстанавливаем соединение... Попытка ${retryCount}/${MAX_RETRIES}`, 'warning');
    
    // Сначала остановим текущее воспроизведение
    videoPlayer.pause();
    
    // Небольшая задержка перед перезагрузкой
    setTimeout(() => {
      // Очистка источника и повторная установка
      const currentSrc = videoPlayer.src;
      videoPlayer.src = '';
      videoPlayer.load();
      videoPlayer.src = currentSrc;
      
      videoPlayer.load();
      videoPlayer.play().then(() => {
        isPlaying = true;
        toggleBufferIndicator(false);
        showToast('Воспроизведение успешно восстановлено', 'success');
        
        // Сбрасываем счетчик только после успешного воспроизведения в течение 5 секунд
        setTimeout(() => {
          if (isPlaying && !videoPlayer.paused) {
            retryCount = 0;
            console.log('Воспроизведение успешно восстановлено');
          }
        }, 5000);
      }).catch(err => {
        console.error('Ошибка перезапуска:', err);
        toggleBufferIndicator(false);
        
        // Показываем уведомление с возможностью ручного перезапуска
        showToast('Не удалось автоматически восстановить воспроизведение', 'error', 0, {
          text: 'Попробовать снова',
          callback: restartPlayback
        });
        
        // Повторная попытка через увеличивающийся интервал
        setTimeout(restartPlayback, RETRY_DELAY * Math.min(retryCount, 3));
      });
    }, 500);
  }

  // Функция для проверки качества соединения
  function checkConnectionQuality() {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const testImage = new Image();
      testImage.onload = function() {
        const loadTime = Date.now() - startTime;
        const quality = loadTime < 1000 ? 'good' : loadTime < 3000 ? 'average' : 'poor';
        connectionQuality = quality;
        resolve(quality);
      };
      testImage.onerror = function() {
        connectionQuality = 'poor';
        resolve('poor');
      };
      // Загружаем маленькое изображение для проверки соединения
      // Используем случайный параметр для предотвращения кэширования
      testImage.src = `data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7?${Date.now()}`;
    });
  }
  
  // Функция для адаптации качества в зависимости от соединения
  function adaptQualityToConnection() {
    checkConnectionQuality().then(quality => {
      if (quality === 'poor' && currentQuality !== 'low') {
        updateQualityIndicator('low');
        showToast('Качество снижено из-за медленного соединения', 'warning');
      } else if (quality === 'average' && currentQuality === 'high') {
        updateQualityIndicator('medium');
        showToast('Качество адаптировано под ваше соединение', 'info');
      } else if (quality === 'good' && (currentQuality === 'low' || currentQuality === 'medium')) {
        updateQualityIndicator('high');
        showToast('Качество повышено', 'success');
      }
    });
  }
  
  // Функция для отслеживания активности пользователя
  function resetUserActivity() {
    lastActivity = Date.now();
    if (userInactive) {
      userInactive = false;
      document.body.style.cursor = '';
      showControls();
    }
  }
  
  // Функция для показа элементов управления
  function showControls() {
    if (!controlsVisible) {
      const controls = document.querySelector('.video-controls');
      if (controls) {
        controls.classList.add('visible');
        controlsVisible = true;
      }
    }
    
    // Сбрасываем таймер автоскрытия
    if (controlsTimeout) {
      clearTimeout(controlsTimeout);
    }
    
    // Устанавливаем новый таймер для автоскрытия
    controlsTimeout = setTimeout(hideControls, 3000);
  }
  
  // Функция для скрытия элементов управления
  function hideControls() {
    if (controlsVisible && isPlaying && !videoPlayer.paused) {
      const controls = document.querySelector('.video-controls');
      if (controls) {
        controls.classList.remove('visible');
        controlsVisible = false;
      }
    }
  }
  
  // Запуск воспроизведения по клику на оверлей
  playOverlay.addEventListener('click', function() {
    playOverlay.classList.add('hidden');
    toggleBufferIndicator(true);
    
    // Проверяем качество соединения перед запуском
    checkConnectionQuality().then(quality => {
      console.log(`Качество соединения: ${quality}`);
      
      if (quality === 'poor') {
        showToast('Обнаружено медленное соединение. Адаптируем качество...', 'warning');
        updateQualityIndicator('low');
      }
      
      videoPlayer.play().then(() => {
        isPlaying = true;
        toggleBufferIndicator(false);
        showToast('Трансляция началась', 'success');
      }).catch(error => {
        console.error('Ошибка запуска воспроизведения:', error);
        
        // Проверяем, связана ли ошибка с автовоспроизведением
        if (error.name === 'NotAllowedError') {
          showToast('Автовоспроизведение заблокировано браузером. Нажмите еще раз для запуска.', 'warning', 0, {
            text: 'Запустить',
            callback: () => {
              videoPlayer.muted = true; // Пробуем запустить с отключенным звуком
              videoPlayer.play().then(() => {
                isPlaying = true;
                toggleBufferIndicator(false);
                showToast('Трансляция началась (звук отключен). Нажмите на значок звука, чтобы включить его.', 'info');
              }).catch(err => {
                console.error('Не удалось запустить даже с отключенным звуком:', err);
                showToast('Не удалось начать воспроизведение. Попробуйте еще раз.', 'error');
              });
            }
          });
        } else {
          showToast('Не удалось начать воспроизведение. Попробуйте еще раз.', 'error', 0, {
            text: 'Повторить',
            callback: () => {
              playOverlay.click();
            }
          });
        }
        
        playOverlay.classList.remove('hidden');
        toggleBufferIndicator(false);
      });
    });
  });

  // Обработчик события ошибки воспроизведения
  videoPlayer.addEventListener('error', function(e) {
    console.error('Событие error:', e);
    const errorCode = videoPlayer.error ? videoPlayer.error.code : 'unknown';
    console.error(`Код ошибки: ${errorCode}`);
    
    if (isPlaying) {
      toggleBufferIndicator(true);
      
      // Разные сообщения в зависимости от типа ошибки
      let errorMsg = 'Проблема с воспроизведением. Пытаемся восстановить...';
      let errorType = 'error';
      let actionCallback = restartPlayback;
      
      if (errorCode === 2) {
        errorMsg = 'Ошибка сети. Проверьте подключение к интернету.';
        streamStatus.textContent = 'Ошибка сети';
      } else if (errorCode === 3) {
        errorMsg = 'Ошибка декодирования видео. Пытаемся восстановить...';
        streamStatus.textContent = 'Ошибка декодирования';
      } else if (errorCode === 4) {
        errorMsg = 'Формат видео не поддерживается вашим браузером.';
        streamStatus.textContent = 'Несовместимый формат';
        actionCallback = () => window.location.reload();
      }
      
      document.querySelector('.status-indicator').style.backgroundColor = '#DC3545';
      
      showToast(errorMsg, errorType, 0, {
        text: 'Перезапустить',
        callback: actionCallback
      });
      
      // Задержка перед перезапуском, чтобы избежать цикла быстрых перезапусков
      setTimeout(restartPlayback, RETRY_DELAY);
    }
  });

  // Обработчик события остановки (stalled) при проблемах с сетью
  videoPlayer.addEventListener('stalled', function(e) {
    console.warn('Событие stalled: поток замедлился или остановился', e);
    if (isPlaying) {
      toggleBufferIndicator(true);
      
      // Очищаем предыдущий таймер, если он существует
      if (bufferingTimeout) {
        clearTimeout(bufferingTimeout);
      }
      
      // Устанавливаем новый таймер для проверки состояния через 5 секунд
      bufferingTimeout = setTimeout(() => {
        if (videoPlayer.readyState < 3) { // Если все еще буферизуется
          // Проверяем качество соединения перед перезапуском
          checkConnectionQuality().then(quality => {
            if (quality === 'poor') {
              toggleErrorMessage(true, 'Медленное интернет-соединение. Пытаемся адаптировать качество...');
            }
            restartPlayback();
          });
        } else {
          toggleBufferIndicator(false);
        }
      }, 5000);
    }
  });

  // Обработчик события ожидания (waiting) – когда буферизация длится дольше обычного
  videoPlayer.addEventListener('waiting', function(e) {
    console.warn('Событие waiting: буферизация или задержка данных', e);
    if (isPlaying) {
      toggleBufferIndicator(true);
      
      // Устанавливаем таймер для проверки длительной буферизации
      if (bufferingTimeout) {
        clearTimeout(bufferingTimeout);
      }
      
      bufferingTimeout = setTimeout(() => {
        if (videoPlayer.readyState < 3) {
          toggleErrorMessage(true, 'Длительная буферизация. Пытаемся улучшить воспроизведение...');
          restartPlayback();
        }
      }, 10000); // Более длительное ожидание для события waiting
    }
  });

  // Обработчик, уведомляющий о готовности к воспроизведению
  videoPlayer.addEventListener('canplay', function(e) {
    console.log('Событие canplay: видео готово к воспроизведению', e);
    toggleBufferIndicator(false);
    
    // Очищаем таймер буферизации
    if (bufferingTimeout) {
      clearTimeout(bufferingTimeout);
      bufferingTimeout = null;
    }
  });
  
  // Обработчик начала воспроизведения
  videoPlayer.addEventListener('playing', function(e) {
    console.log('Событие playing: воспроизведение началось', e);
    isPlaying = true;
    toggleBufferIndicator(false);
    
    // Очищаем таймеры
    if (bufferingTimeout) {
      clearTimeout(bufferingTimeout);
      bufferingTimeout = null;
    }
    
    // Сбрасываем счетчик только после стабильного воспроизведения
    setTimeout(() => {
      if (isPlaying && !videoPlayer.paused) {
        retryCount = 0;
      }
    }, 3000);
  });

  // Обработчик прерывания воспроизведения (abort)
  videoPlayer.addEventListener('abort', function(e) {
    console.warn('Событие abort: воспроизведение прервано', e);
    if (isPlaying) {
      toggleBufferIndicator(true);
      setTimeout(() => {
        if (isPlaying) {
          restartPlayback();
        }
      }, RETRY_DELAY);
    }
  });

  // Обработчик события progress для мониторинга загрузки данных
  let lastProgressLog = 0;
  videoPlayer.addEventListener('progress', function(e) {
    const now = Date.now();
    // Логируем не чаще чем раз в 5 секунд
    if (now - lastProgressLog > 5000) {
      console.log('Событие progress: загрузка данных');
      lastProgressLog = now;
      
      // Проверяем буферы
      if (videoPlayer.buffered.length > 0) {
        const bufferedEnd = videoPlayer.buffered.end(videoPlayer.buffered.length - 1);
        const duration = videoPlayer.duration;
        const bufferedPercent = (bufferedEnd / duration) * 100;
        console.log(`Буферизовано: ${bufferedPercent.toFixed(2)}%`);
      }
    }
  });

  // Обработчик паузы
  videoPlayer.addEventListener('pause', function(e) {
    console.log('Событие pause: видео поставлено на паузу', e);
    isPlaying = false;
    
    // Если пауза не была вызвана пользователем, а произошла из-за проблем с сетью
    if (!videoPlayer.seeking && document.visibilityState !== 'hidden') {
      // Проверяем, не была ли пауза вызвана пользователем через элементы управления
      const userInitiated = e.isTrusted && e.type === 'pause';
      
      if (!userInitiated) {
        console.warn('Обнаружена автоматическая пауза, возможно проблемы с сетью');
        toggleBufferIndicator(true);
        
        // Пытаемся восстановить воспроизведение через короткий промежуток времени
        setTimeout(() => {
          checkConnectionQuality().then(quality => {
            if (quality !== 'poor') {
              videoPlayer.play().catch(err => {
                console.error('Не удалось автоматически возобновить воспроизведение:', err);
                restartPlayback();
              });
            } else {
              restartPlayback();
            }
          });
        }, 1000);
      }
    }
  });

  // Обработчик окончания видео
  videoPlayer.addEventListener('ended', function(e) {
    console.log('Событие ended: видео закончилось', e);
    isPlaying = false;
    playOverlay.classList.remove('hidden');
    
    // Для прямых трансляций это может означать, что трансляция завершилась
    toggleErrorMessage(true, 'Трансляция завершена или временно приостановлена.');
  });
  
  // Обработчик восстановления после буферизации
  videoPlayer.addEventListener('timeupdate', function() {
    if (videoPlayer.readyState >= 3 && isPlaying) {
      toggleBufferIndicator(false);
      
      // Очищаем таймер буферизации
      if (bufferingTimeout) {
        clearTimeout(bufferingTimeout);
        bufferingTimeout = null;
      }
    }
  });
  
  // Проверка состояния сети
  window.addEventListener('online', function() {
    console.log('Соединение с интернетом восстановлено');
    toggleErrorMessage(true, 'Соединение восстановлено. Возобновляем воспроизведение...');
    
    // Даем немного времени для стабилизации соединения
    if (networkRecoveryTimer) {
      clearTimeout(networkRecoveryTimer);
    }
    
    networkRecoveryTimer = setTimeout(() => {
      if (isPlaying && videoPlayer.paused) {
        restartPlayback();
      }
    }, 2000);
  });
  
  window.addEventListener('offline', function() {
    console.warn('Соединение с интернетом потеряно');
    toggleErrorMessage(true, 'Отсутствует подключение к интернету. Воспроизведение будет продолжено автоматически при восстановлении соединения.');
    toggleBufferIndicator(true);
  });
  
  // Обработка видимости страницы
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') {
      console.log('Страница стала видимой');
      // Если воспроизведение было активно до скрытия страницы
      if (isPlaying && videoPlayer.paused) {
        console.log('Возобновляем воспроизведение после возвращения на страницу');
        videoPlayer.play().catch(err => {
          console.error('Ошибка возобновления после возвращения на страницу:', err);
          restartPlayback();
        });
      }
    } else {
      console.log('Страница скрыта');
      // Можно добавить логику для оптимизации ресурсов при скрытой странице
    }
  });
  
  // Обработчики для отслеживания активности пользователя
  document.addEventListener('mousemove', resetUserActivity);
  document.addEventListener('keydown', resetUserActivity);
  document.addEventListener('touchstart', resetUserActivity);
  
  // Обработчик для показа/скрытия элементов управления при движении мыши
  videoPlayer.addEventListener('mousemove', function() {
    resetUserActivity();
    showControls();
  });
  
  // Обработчик для скрытия элементов управления при неактивности
  setInterval(() => {
    const now = Date.now();
    if (now - lastActivity > 3000 && isPlaying && !videoPlayer.paused) {
      if (!userInactive) {
        userInactive = true;
        document.body.style.cursor = 'none';
        hideControls();
      }
    }
  }, 1000);
  
  // Обработчик двойного клика для полноэкранного режима
  videoPlayer.addEventListener('dblclick', function() {
    if (!document.fullscreenElement) {
      videoPlayer.requestFullscreen().catch(err => {
        showToast('Не удалось перейти в полноэкранный режим: ' + err.message, 'error');
      });
    } else {
      document.exitFullscreen();
    }
  });
  
  // Обработчик изменения полноэкранного режима
  document.addEventListener('fullscreenchange', function() {
    if (document.fullscreenElement) {
      showToast('Полноэкранный режим включен', 'info', 2000);
    } else {
      showToast('Полноэкранный режим выключен', 'info', 2000);
    }
  });
  
  // Периодическая проверка состояния воспроизведения
  setInterval(() => {
    if (isPlaying && videoPlayer.paused && document.visibilityState === 'visible') {
      console.warn('Обнаружена неожиданная пауза при активном воспроизведении');
      toggleBufferIndicator(true);
      
      checkConnectionQuality().then(quality => {
        if (quality !== 'poor') {
          console.log('Пытаемся возобновить воспроизведение...');
          videoPlayer.play().catch(err => {
            console.error('Не удалось возобновить воспроизведение:', err);
            restartPlayback();
          });
        } else {
          console.warn('Плохое качество соединения, перезапускаем поток');
          restartPlayback();
        }
      });
    }
  }, 10000);
  
  // Периодическая проверка качества соединения и адаптация качества
  setInterval(() => {
    if (isPlaying && !videoPlayer.paused) {
      adaptQualityToConnection();
    }
  }, 30000);
});
