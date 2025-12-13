document.addEventListener('DOMContentLoaded', () => {
  const processForm = document.getElementById('processForm');
  const videoList = document.getElementById('videoList');
  const inputPreviewList = document.getElementById('inputPreviewList');
  const outputResultList = document.getElementById('outputResultList');
  const addVideoBtn = document.getElementById('addVideoBtn');
  const submitBtn = document.getElementById('submitBtn');
  const toggleSidebarBtn = document.getElementById('toggleSidebar');
  const containerEl = document.querySelector('.container');
  const sidebarIconBtn = document.getElementById('sidebarIcon');
  const sidebarHandleBtn = document.getElementById('sidebarHandle');

  // History Elements
  const historyDrawer = document.getElementById('historyDrawer');
  const toggleHistoryBtn = document.getElementById('toggleHistoryBtn');
  const closeHistoryBtn = document.getElementById('closeHistoryBtn');
  const refreshHistoryBtn = document.getElementById('refreshHistoryBtn');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  const historyList = document.getElementById('historyList');
  const historyItemTemplate = document.getElementById('historyItemTemplate');

  // Sidebar Logic
  const updateSidebarUI = (collapsed) => {
    if (toggleSidebarBtn) {
      toggleSidebarBtn.textContent = collapsed ? '展开配置' : '收起配置';
    }
    if (sidebarIconBtn) {
      sidebarIconBtn.title = collapsed ? '显示任务配置' : '隐藏任务配置';
      sidebarIconBtn.textContent = collapsed ? '⟩' : '⟨';
    }
    if (sidebarHandleBtn) {
      sidebarHandleBtn.style.display = collapsed ? 'block' : 'none';
    }
  };

  updateSidebarUI(containerEl.classList.contains('sidebar-collapsed'));

  if (toggleSidebarBtn && containerEl) {
    toggleSidebarBtn.addEventListener('click', () => {
      const collapsed = containerEl.classList.toggle('sidebar-collapsed');
      updateSidebarUI(collapsed);
    });
  }

  if (sidebarIconBtn && containerEl) {
    sidebarIconBtn.addEventListener('click', () => {
      const collapsed = containerEl.classList.toggle('sidebar-collapsed');
      updateSidebarUI(collapsed);
    });
  }

  if (sidebarHandleBtn && containerEl) {
    sidebarHandleBtn.addEventListener('click', () => {
      const collapsed = containerEl.classList.toggle('sidebar-collapsed');
      updateSidebarUI(collapsed);
    });
  }

  // History Logic
  if (toggleHistoryBtn) {
    toggleHistoryBtn.addEventListener('click', () => {
      historyDrawer.classList.add('open');
      loadHistory();
    });
  }
  if (closeHistoryBtn) {
    closeHistoryBtn.addEventListener('click', () => {
      historyDrawer.classList.remove('open');
    });
  }
  if (refreshHistoryBtn) refreshHistoryBtn.addEventListener('click', loadHistory);
  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', async () => {
      if (confirm('确定要清空所有历史记录吗？')) {
        try {
          await fetch('/api/history', { method: 'DELETE' });
          loadHistory();
        } catch (e) {
          alert('清空失败');
        }
      }
    });
  }

  async function loadHistory() {
    historyList.innerHTML = '<div class="empty-history">加载中...</div>';
    try {
      const res = await fetch('/api/history');
      const records = await res.json();
      renderHistory(records);
    } catch (e) {
      historyList.innerHTML = '<div class="empty-history">加载失败</div>';
    }
  }

  function renderHistory(records) {
    historyList.innerHTML = '';
    if (!records || records.length === 0) {
      historyList.innerHTML = '<div class="empty-history">暂无历史记录</div>';
      return;
    }

    records.forEach(record => {
      const node = historyItemTemplate.content.cloneNode(true);
      const item = node.querySelector('.history-item');
      
      const date = new Date(record.timestamp);
      item.querySelector('.history-time').textContent = date.toLocaleString();
      item.querySelector('.history-prompt').textContent = record.config.prompt;
      
      const mode = record.config.mask_only ? 'Mask Only' : 'Video';
      item.querySelector('.history-config-tag').textContent = `${mode} | ${record.config.mask_color} | Opacity: ${record.config.mask_opacity}`;
      
      const fileCount = record.inputVideo ? record.inputVideo.length : 0;
      item.querySelector('.history-files-preview').innerHTML = `<small>包含 ${fileCount} 个视频</small>`;

      item.querySelector('.load-history-btn').addEventListener('click', () => {
        restoreHistoryRecord(record);
        historyDrawer.classList.remove('open');
      });

      item.querySelector('.delete-history-item-btn').addEventListener('click', async () => {
          if(confirm('删除此条记录？')) {
               try {
                   await fetch(`/api/history/${record.id || record.timestamp}`, { method: 'DELETE' });
                   item.remove();
                   if(historyList.children.length === 0) {
                       historyList.innerHTML = '<div class="empty-history">暂无历史记录</div>';
                   }
               } catch(err) {
                   alert('删除失败');
               }
          }
      });

      historyList.appendChild(item);
    });
  }

  function restoreHistoryRecord(record) {
    if (!record || !record.config) return;
    
    const config = record.config;
    if (config.prompt) document.getElementById('global_prompt').value = config.prompt;
    if (config.mask_color) document.getElementById('mask_color').value = config.mask_color;
    if (config.mask_opacity) document.getElementById('mask_opacity').value = config.mask_opacity;
    document.getElementById('mask_only').checked = !!config.mask_only;
    document.getElementById('return_zip').checked = !!config.return_zip;

    videoList.innerHTML = '';
    inputPreviewList.innerHTML = '';
    outputResultList.innerHTML = '';
    
    if (record.inputVideo && Array.isArray(record.inputVideo)) {
        record.inputVideo.forEach((url, i) => {
            addVideoItem(url);
            // Restore Output
            if (record.outputVideo && record.outputVideo[i]) {
                const resultItem = outputResultList.lastElementChild;
                if (resultItem) {
                    const video = resultItem.querySelector('video');
                    const placeholder = resultItem.querySelector('.placeholder');
                    const downloadLink = resultItem.querySelector('.download-link');
                    
                    const outputUrl = record.outputVideo[i];
                    video.src = outputUrl;
                    video.style.display = 'block';
                    placeholder.style.display = 'none';
                    
                    const isZip = outputUrl.endsWith('.zip');
                    if (isZip) {
                         downloadLink.innerHTML = `<a href="${outputUrl}" target="_blank" class="download-btn">📥 下载结果 ZIP</a>`;
                    } else {
                         downloadLink.innerHTML = `<a href="${outputUrl}" target="_blank">🔗 下载视频</a>`;
                    }
                    downloadLink.style.display = 'block';
                }
            }
        });
    }
  }

  // Video List Management
  const videoInputTemplate = document.getElementById('videoInputTemplate');
  const inputPreviewTemplate = document.getElementById('inputPreviewTemplate');
  const outputResultTemplate = document.getElementById('outputResultTemplate');
  let videoCount = 0;

  const presetVideos = [
    'https://public-temp-no-auth.oss-cn-shanghai.aliyuncs.com/sam3/samsource-1.mp4',
    'https://public-temp-no-auth.oss-cn-shanghai.aliyuncs.com/sam3/samsource-2.mp4',
    'https://public-temp-no-auth.oss-cn-shanghai.aliyuncs.com/sam3/samsource-3.mp4',
    'https://public-temp-no-auth.oss-cn-shanghai.aliyuncs.com/sam3/samsource-4.mp4'
  ];

  if (presetVideos.length > 0) {
    presetVideos.forEach(url => addVideoItem(url));
  } else {
    addVideoItem();
  }

  addVideoBtn.addEventListener('click', () => addVideoItem());

  videoList.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-btn')) {
      const item = e.target.closest('.video-item-input');
      const index = item.dataset.index;
      removeVideoItem(index);
    }
  });

  videoList.addEventListener('focusout', (e) => {
    if (e.target.classList.contains('video-url-input')) {
      const input = e.target;
      const index = input.closest('.video-item-input').dataset.index;
      updatePreview(index, input.value);
    }
  });

  videoList.addEventListener('dblclick', (e) => {
    const target = e.target.closest('.item-title');
    if (target) {
      const currentName = target.textContent;
      const input = document.createElement('input');
      input.type = 'text';
      input.value = currentName;
      input.className = 'item-title-input';
      
      const originalDisplay = target.style.display;
      target.style.display = 'none';
      target.parentNode.insertBefore(input, target);
      input.focus();

      const saveName = () => {
        const newName = input.value.trim() || currentName;
        target.textContent = newName;
        target.style.display = originalDisplay;
        input.remove();
        const index = target.closest('.video-item-input').dataset.index;
        updateTaskTitles(index, newName);
      };

      input.addEventListener('blur', saveName);
      input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') saveName();
      });
    }
  });

  const syncScroll = () => {
    const scrollTop = videoList.scrollTop;
    inputPreviewList.scrollTop = scrollTop;
    outputResultList.scrollTop = scrollTop;
  };
  videoList.addEventListener('scroll', syncScroll);

  function addVideoItem(initialUrl = '') {
    videoCount++;
    const index = videoCount;

    const inputNode = videoInputTemplate.content.cloneNode(true);
    const inputItem = inputNode.querySelector('.video-item-input');
    inputItem.dataset.index = index;
    inputItem.querySelector('.index-display').textContent = index;
    if (initialUrl) inputItem.querySelector('.video-url-input').value = initialUrl;
    
    if (videoList.children.length === 0) {
      inputItem.querySelector('.delete-btn').style.display = 'none';
    } else {
      const firstBtn = videoList.querySelector('.video-item-input .delete-btn');
      if (firstBtn) firstBtn.style.display = 'inline-block';
    }
    videoList.appendChild(inputItem);

    const previewNode = inputPreviewTemplate.content.cloneNode(true);
    const previewItem = previewNode.querySelector('.video-item-preview');
    previewItem.dataset.index = index;
    previewItem.id = `preview-${index}`;
    previewItem.querySelector('.index-display').textContent = index;
    inputPreviewList.appendChild(previewItem);

    const resultNode = outputResultTemplate.content.cloneNode(true);
    const resultItem = resultNode.querySelector('.video-item-result');
    resultItem.dataset.index = index;
    resultItem.id = `result-${index}`;
    resultItem.querySelector('.index-display').textContent = index;
    outputResultList.appendChild(resultItem);

    if (initialUrl) updatePreview(index, initialUrl);
  }

  function removeVideoItem(index) {
    const inputItem = videoList.querySelector(`.video-item-input[data-index="${index}"]`);
    if (inputItem) inputItem.remove();
    const previewItem = document.getElementById(`preview-${index}`);
    if (previewItem) previewItem.remove();
    const resultItem = document.getElementById(`result-${index}`);
    if (resultItem) resultItem.remove();

    if (videoList.children.length === 1) {
      videoList.querySelector('.delete-btn').style.display = 'none';
    }
  }

  function updatePreview(index, url) {
    const previewItem = document.getElementById(`preview-${index}`);
    if (!previewItem) return;
    const video = previewItem.querySelector('video');
    const placeholder = previewItem.querySelector('.placeholder');
    const cleanUrl = url.trim().replace(/`/g, '');
    if (cleanUrl) {
      video.src = cleanUrl;
      video.style.display = 'block';
      placeholder.style.display = 'none';
      video.load();
    } else {
      video.style.display = 'none';
      video.src = '';
      placeholder.style.display = 'block';
    }
  }

  function updateTaskTitles(index, newName) {
    const previewItem = document.getElementById(`preview-${index}`);
    if (previewItem) previewItem.querySelector('.item-label').textContent = newName;
    const resultItem = document.getElementById(`result-${index}`);
    if (resultItem) resultItem.querySelector('.label-text').textContent = newName;
  }

  // Submit Handler
  processForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(processForm);
    const globalSettings = {
      prompt: formData.get('global_prompt').trim(),
      mask_color: formData.get('mask_color'),
      mask_opacity: formData.get('mask_opacity'),
      mask_only: processForm.querySelector('#mask_only').checked,
      return_zip: processForm.querySelector('#return_zip').checked
    };

    if (!globalSettings.prompt) {
      alert('请填写全局提示词');
      return;
    }

    const videoItems = videoList.querySelectorAll('.video-item-input');
    const tasks = [];
    videoItems.forEach(item => {
      const index = item.dataset.index;
      const videoUrl = item.querySelector('.video-url-input').value.trim();
      if (videoUrl) {
        tasks.push({ index, video: videoUrl, ...globalSettings });
      }
    });

    if (tasks.length === 0) {
      alert('请至少填写一个完整的视频任务');
      return;
    }

    const concurrentLimitInput = processForm.querySelector('#concurrent_limit');
    let concurrentLimit = parseInt(concurrentLimitInput ? concurrentLimitInput.value : 1, 10);
    if (isNaN(concurrentLimit) || concurrentLimit < 1) concurrentLimit = 1;

    submitBtn.disabled = true;
    submitBtn.textContent = `正在处理 ${tasks.length} 个任务 (并发: ${concurrentLimit})...`;

    tasks.forEach(task => {
      const resultItem = document.getElementById(`result-${task.index}`);
      const video = resultItem.querySelector('video');
      const placeholder = resultItem.querySelector('.placeholder');
      const loading = resultItem.querySelector('.loading');
      const downloadLink = resultItem.querySelector('.download-link');
      const errorMsg = resultItem.querySelector('.error-msg');

      video.style.display = 'none';
      video.src = '';
      placeholder.innerHTML = `<div class="crazy-loading"><div class="crazy-spinner"></div><p>正在疯狂检测中</p></div>`;
      placeholder.style.display = 'block';
      placeholder.style.color = '#f1c40f';
      loading.style.display = 'none';
      downloadLink.style.display = 'none';
      errorMsg.style.display = 'none';
      
      const newErrorMsg = errorMsg.cloneNode(true);
      errorMsg.parentNode.replaceChild(newErrorMsg, errorMsg);
    });

    // History Data Collection
    const batchHistory = {
        config: globalSettings,
        inputVideo: tasks.map(t => t.video),
        outputVideo: new Array(tasks.length).fill(null), // Initialize with null
        timestamp: new Date().toISOString()
    };

    const activePromises = new Set();
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      if (activePromises.size >= concurrentLimit) {
        await Promise.race(activePromises);
      }

      const p = processTask(task).then((resultUrl) => {
          // Success: Store result
          if (resultUrl) {
              // Find index in tasks to map to outputVideo
              // task is the same object reference from tasks array? Yes.
              // But we need the index.
              batchHistory.outputVideo[i] = resultUrl;
          }
      }).catch(() => {
          // Failed
      });
      
      const promiseWithCleanup = p.finally(() => {
        activePromises.delete(promiseWithCleanup);
      });
      activePromises.add(promiseWithCleanup);

      if (concurrentLimit > 1 && i < tasks.length - 1) {
        await delay(2000);
      } else if (concurrentLimit === 1 && i < tasks.length - 1) {
         await delay(2000);
      }
    }

    await Promise.all(activePromises);

    // Save History
    // Only save if at least one output exists? Or save anyway?
    // User wants to see history.
    if (batchHistory.outputVideo.some(v => v !== null)) {
        try {
            await fetch('/api/history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(batchHistory)
            });
        } catch(e) {
            console.error('Failed to save history', e);
        }
    }

    submitBtn.disabled = false;
    submitBtn.textContent = '开始处理所有任务';
  });

  async function processTask(task) {
    const resultItem = document.getElementById(`result-${task.index}`);
    const video = resultItem.querySelector('video');
    const loading = resultItem.querySelector('.loading');
    const downloadLink = resultItem.querySelector('.download-link');
    const errorMsg = resultItem.querySelector('.error-msg');
    const placeholder = resultItem.querySelector('.placeholder');

    try {
      const response = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
      });
      const result = await response.json();

      if (response.ok) {
        if (task.return_zip) {
          placeholder.textContent = '处理完成 (ZIP)';
          placeholder.style.display = 'block';
          downloadLink.innerHTML = `<a href="${result.url}" target="_blank" class="download-btn">📥 下载结果 ZIP</a><br><small>${result.filename}</small>`;
          downloadLink.style.display = 'block';
        } else {
          video.src = result.url;
          video.style.display = 'block';
          video.load();
          video.play().catch(e => console.log('Autoplay blocked', e));
          placeholder.style.display = 'none';
          downloadLink.innerHTML = `<a href="${result.url}" target="_blank">🔗 下载视频</a>`;
          downloadLink.style.display = 'block';
        }
        return result.url;
      } else {
        if (response.status === 429) throw new Error('请求过于频繁');
        throw new Error(result.error || '未知错误');
      }
    } catch (error) {
      console.error(`Task ${task.index} error:`, error);
      errorMsg.innerHTML = `<div class="error-state"><p>出错: ${error.message}</p><button type="button" class="retry-btn">重试</button></div>`;
      errorMsg.style.display = 'block';
      placeholder.style.display = 'none';
      
      const retryBtn = errorMsg.querySelector('.retry-btn');
      if (retryBtn) {
        retryBtn.onclick = () => {
          errorMsg.style.display = 'none';
          placeholder.innerHTML = `<div class="crazy-loading"><div class="crazy-spinner"></div><p>正在疯狂检测中</p></div>`;
          placeholder.style.display = 'block';
          placeholder.style.color = '#f1c40f';
          processTask(task);
        };
      }
      throw error;
    }
  }
});
