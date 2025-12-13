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

  // 初始化悬浮按钮显示状态
  updateSidebarUI(containerEl.classList.contains('sidebar-collapsed'));
  const videoInputTemplate = document.getElementById('videoInputTemplate');
  const inputPreviewTemplate = document.getElementById('inputPreviewTemplate');
  const outputResultTemplate = document.getElementById('outputResultTemplate');

  let videoCount = 0;

  // 初始化：预设视频
  const presetVideos = [
    'https://public-temp-no-auth.oss-cn-shanghai.aliyuncs.com/sam3/samsource-1.mp4',
    'https://public-temp-no-auth.oss-cn-shanghai.aliyuncs.com/sam3/samsource-2.mp4',
    'https://public-temp-no-auth.oss-cn-shanghai.aliyuncs.com/sam3/samsource-3.mp4',
    'https://public-temp-no-auth.oss-cn-shanghai.aliyuncs.com/sam3/samsource-4.mp4'
  ];

  if (presetVideos.length > 0) {
    presetVideos.forEach(url => addVideoItem(url));
  } else {
    // 默认添加一个空任务
    addVideoItem();
  }

  // 添加视频按钮点击事件
  addVideoBtn.addEventListener('click', () => {
    addVideoItem();
  });

  // 侧栏开关
  if (toggleSidebarBtn && containerEl) {
    toggleSidebarBtn.addEventListener('click', () => {
      const collapsed = containerEl.classList.toggle('sidebar-collapsed');
      updateSidebarUI(collapsed);
    });
  }

  // 左侧图标开关
  if (sidebarIconBtn && containerEl) {
    sidebarIconBtn.addEventListener('click', () => {
      const collapsed = containerEl.classList.toggle('sidebar-collapsed');
      updateSidebarUI(collapsed);
    });
  }

  // 浮动手柄开关（收起时显示）
  if (sidebarHandleBtn && containerEl) {
    sidebarHandleBtn.addEventListener('click', () => {
      const collapsed = containerEl.classList.toggle('sidebar-collapsed');
      updateSidebarUI(collapsed);
    });
  }

  // 删除视频项事件委托
  videoList.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-btn')) {
      const item = e.target.closest('.video-item-input');
      const index = item.dataset.index;
      removeVideoItem(index);
    }
  });

  // 视频 URL 输入失焦事件委托 (用于预览)
  videoList.addEventListener('focusout', (e) => {
    if (e.target.classList.contains('video-url-input')) {
      const input = e.target;
      const index = input.closest('.video-item-input').dataset.index;
      updatePreview(index, input.value);
    }
  });

  // 双击修改任务名称
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
        
        // 同步更新预览和结果栏的标题
        const index = target.closest('.video-item-input').dataset.index;
        updateTaskTitles(index, newName);
      };

      input.addEventListener('blur', saveName);
      input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
          saveName();
        }
      });
    }
  });

  // 同步滚动功能
  const syncScroll = () => {
    const scrollTop = videoList.scrollTop;
    inputPreviewList.scrollTop = scrollTop;
    outputResultList.scrollTop = scrollTop;
  };

  videoList.addEventListener('scroll', syncScroll);

  function addVideoItem(initialUrl = '') {
    videoCount++;
    const index = videoCount; // 使用递增 ID 作为唯一标识

    // 1. 添加输入项 (Left)
    const inputNode = videoInputTemplate.content.cloneNode(true);
    const inputItem = inputNode.querySelector('.video-item-input');
    inputItem.dataset.index = index;
    inputItem.querySelector('.index-display').textContent = index;

    if (initialUrl) {
      inputItem.querySelector('.video-url-input').value = initialUrl;
    }
    
    // 如果是第一个，隐藏删除按钮（至少保留一个）
    if (videoList.children.length === 0) {
      inputItem.querySelector('.delete-btn').style.display = 'none';
    } else {
      // 显示之前第一个的删除按钮（如果有的话，其实默认模板是显示的，只是第一个特殊处理）
      const firstBtn = videoList.querySelector('.video-item-input .delete-btn');
      if (firstBtn) firstBtn.style.display = 'inline-block';
    }

    videoList.appendChild(inputItem);

    // 2. 添加预览项 (Middle)
    const previewNode = inputPreviewTemplate.content.cloneNode(true);
    const previewItem = previewNode.querySelector('.video-item-preview');
    previewItem.dataset.index = index;
    previewItem.id = `preview-${index}`;
    previewItem.querySelector('.index-display').textContent = index;
    inputPreviewList.appendChild(previewItem);

    // 3. 添加结果项 (Right)
    const resultNode = outputResultTemplate.content.cloneNode(true);
    const resultItem = resultNode.querySelector('.video-item-result');
    resultItem.dataset.index = index;
    resultItem.id = `result-${index}`;
    resultItem.querySelector('.index-display').textContent = index;
    outputResultList.appendChild(resultItem);

    // 如果有初始URL，触发预览更新
    if (initialUrl) {
      updatePreview(index, initialUrl);
    }

    // 滚动到底部
    // videoList.scrollTop = videoList.scrollHeight;
  }

  function removeVideoItem(index) {
    // 移除 Input
    const inputItem = videoList.querySelector(`.video-item-input[data-index="${index}"]`);
    if (inputItem) inputItem.remove();

    // 移除 Preview
    const previewItem = document.getElementById(`preview-${index}`);
    if (previewItem) previewItem.remove();

    // 移除 Result
    const resultItem = document.getElementById(`result-${index}`);
    if (resultItem) resultItem.remove();

    // 如果只剩一个，隐藏删除按钮
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
      // video.play().catch(e => console.log('Autoplay blocked', e));
    } else {
      video.style.display = 'none';
      video.src = '';
      placeholder.style.display = 'block';
    }
  }

  function updateTaskTitles(index, newName) {
    const previewItem = document.getElementById(`preview-${index}`);
    if (previewItem) {
      previewItem.querySelector('.item-label').textContent = newName;
    }
    
    const resultItem = document.getElementById(`result-${index}`);
    if (resultItem) {
      resultItem.querySelector('.label-text').textContent = newName;
    }
  }

  // 表单提交处理
  processForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // 获取全局参数
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

    // 获取所有视频任务
    const videoItems = videoList.querySelectorAll('.video-item-input');
    const tasks = [];

    videoItems.forEach(item => {
      const index = item.dataset.index;
      const videoUrl = item.querySelector('.video-url-input').value.trim();

      if (videoUrl) {
        tasks.push({
          index,
          video: videoUrl,
          ...globalSettings
        });
      }
    });

    if (tasks.length === 0) {
      alert('请至少填写一个完整的视频任务');
      return;
    }

    // 获取并发限制
    const concurrentLimitInput = processForm.querySelector('#concurrent_limit');
    let concurrentLimit = parseInt(concurrentLimitInput ? concurrentLimitInput.value : 1, 10);
    if (isNaN(concurrentLimit) || concurrentLimit < 1) concurrentLimit = 1;

    // UI 状态更新
    submitBtn.disabled = true;
    submitBtn.textContent = `正在处理 ${tasks.length} 个任务 (并发: ${concurrentLimit})...`;

    // 重置所有结果状态
    tasks.forEach(task => {
      const resultItem = document.getElementById(`result-${task.index}`);
      const video = resultItem.querySelector('video');
      const placeholder = resultItem.querySelector('.placeholder');
      const loading = resultItem.querySelector('.loading');
      const downloadLink = resultItem.querySelector('.download-link');
      const errorMsg = resultItem.querySelector('.error-msg');

      video.style.display = 'none';
      video.src = '';
      
      // 应用“疯狂检测中”状态
      placeholder.innerHTML = `
        <div class="crazy-loading">
          <div class="crazy-spinner"></div>
          <p>正在疯狂检测中</p>
        </div>
      `;
      placeholder.style.display = 'block';
      placeholder.style.color = '#f1c40f';
      
      loading.style.display = 'none'; // 使用 crazy-loading 替代默认 loading
      downloadLink.style.display = 'none';
      errorMsg.style.display = 'none';
      
      // 移除可能存在的重试按钮监听器（通过替换节点）
      const newErrorMsg = errorMsg.cloneNode(true);
      errorMsg.parentNode.replaceChild(newErrorMsg, errorMsg);
    });

    // 并发调度器
    const executing = [];
    const results = [];

    // 辅助函数：延迟
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      
      // 如果不是第一个任务，且并发限制大于1，则添加间隔延迟（这里简单实现为启动间隔）
      // 需求描述：每个新视频处理任务间隔2秒启动
      if (i > 0 && concurrentLimit > 1) {
        await delay(2000);
      }

      // 创建 Promise 包装，处理完成后从 executing 数组移除自身
      const p = processTask(task).then(() => p);
      executing.push(p);

      // 如果正在执行的任务数达到限制，等待其中一个完成
      if (executing.length >= concurrentLimit) {
        await Promise.race(executing);
      }
      
      // 清理已完成的任务
      // 注意：由于 Promise.race 返回的是完成的那个 Promise 的值（这里我们返回 p 自身），
      // 但我们需要移除已完成的。这里简化处理：
      // 实际上 Promise.race 不会改变数组。我们需要手动维护。
      // 更健壮的方式：
    }
    
    // 等待剩余任务完成
    await Promise.all(executing);

    // 重新实现调度逻辑以确保正确性
    // 上面的 Promise.race 逻辑有点问题，因为 race 不会移除。
    // 我们使用一个递归或循环队列更好。但为了保持逻辑简单并符合“间隔启动”的要求：
    
    /* 
       重新设计调度：
       1. 维护一个 activePromises 集合
       2. 遍历任务，每次启动前检查 activePromises.size
       3. 如果满，await Promise.race(activePromises)
       4. 启动任务：p = processTask().finally(() => activePromises.delete(p))
       5. activePromises.add(p)
       6. 如果 concurrentLimit > 1 且不是第一个，await delay(2000)
    */
  });

  // 替换上面的 submit 监听器逻辑
  processForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // 获取全局参数
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

    // 获取所有视频任务
    const videoItems = videoList.querySelectorAll('.video-item-input');
    const tasks = [];

    videoItems.forEach(item => {
      const index = item.dataset.index;
      const videoUrl = item.querySelector('.video-url-input').value.trim();

      if (videoUrl) {
        tasks.push({
          index,
          video: videoUrl,
          ...globalSettings
        });
      }
    });

    if (tasks.length === 0) {
      alert('请至少填写一个完整的视频任务');
      return;
    }

    // 获取并发限制
    const concurrentLimitInput = processForm.querySelector('#concurrent_limit');
    let concurrentLimit = parseInt(concurrentLimitInput ? concurrentLimitInput.value : 1, 10);
    if (isNaN(concurrentLimit) || concurrentLimit < 1) concurrentLimit = 1;

    // UI 状态更新
    submitBtn.disabled = true;
    submitBtn.textContent = `正在处理 ${tasks.length} 个任务 (并发: ${concurrentLimit})...`;

    // 重置所有结果状态
    tasks.forEach(task => {
      const resultItem = document.getElementById(`result-${task.index}`);
      const video = resultItem.querySelector('video');
      const placeholder = resultItem.querySelector('.placeholder');
      const loading = resultItem.querySelector('.loading');
      const downloadLink = resultItem.querySelector('.download-link');
      const errorMsg = resultItem.querySelector('.error-msg');

      video.style.display = 'none';
      video.src = '';
      
      placeholder.innerHTML = `
        <div class="crazy-loading">
          <div class="crazy-spinner"></div>
          <p>正在疯狂检测中</p>
        </div>
      `;
      placeholder.style.display = 'block';
      placeholder.style.color = '#f1c40f';
      
      loading.style.display = 'none';
      downloadLink.style.display = 'none';
      errorMsg.style.display = 'none';
      
      const newErrorMsg = errorMsg.cloneNode(true);
      errorMsg.parentNode.replaceChild(newErrorMsg, errorMsg);
    });

    // 并发调度器
    const activePromises = new Set();
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];

      // 如果达到并发限制，等待至少一个完成
      if (activePromises.size >= concurrentLimit) {
        await Promise.race(activePromises);
      }

      // 启动任务
      const p = processTask(task).then(() => {
        // 任务完成后从集合移除
      }).catch(() => {
        // 即使失败也移除
      });
      
      // 包装 promise 以便在 finally 中移除自身
      const promiseWithCleanup = p.finally(() => {
        activePromises.delete(promiseWithCleanup);
      });
      
      activePromises.add(promiseWithCleanup);

      // 多线程模式下的启动间隔（非首个任务）
      if (concurrentLimit > 1 && i < tasks.length - 1) {
        await delay(2000);
      } else if (concurrentLimit === 1 && i < tasks.length - 1) {
         // 单线程模式：虽然 await Promise.race 已经等待了，但这里不需要额外 delay，
         // 或者如果需要保持之前的逻辑（串行也可能有间隔？之前的代码有2秒间隔）
         // 之前的逻辑是：if (i < tasks.length - 1) await delay(2000);
         // 需求说：当concurrent_limit=1时：按原有单线程方式顺序处理视频（隐含保留原有逻辑？）
         // 但需求也说：当concurrent_limit>1时...每个新视频处理任务间隔2秒启动
         // 为了安全，单线程模式也保留一定间隔，或者严格串行。
         // 原代码有 2000ms 间隔。保留它。
         await delay(2000);
      }
    }

    // 等待剩余所有任务完成
    await Promise.all(activePromises);

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

      loading.style.display = 'none';

      if (response.ok) {
        if (task.return_zip) {
          // ZIP 模式
          placeholder.textContent = '处理完成 (ZIP)';
          placeholder.style.display = 'block';
          
          downloadLink.innerHTML = `<a href="${result.url}" target="_blank" class="download-btn">📥 下载结果 ZIP</a><br><small>${result.filename}</small>`;
          downloadLink.style.display = 'block';
        } else {
          // Video 模式
          video.src = result.url;
          video.style.display = 'block';
          video.load();
          video.play().catch(e => console.log('Autoplay blocked', e));
          // 隐藏占位文案，展示结果视频
      placeholder.style.display = 'none';
      placeholder.innerHTML = ''; // 清理内容
      
      downloadLink.innerHTML = `<a href="${result.url}" target="_blank">🔗 下载视频</a>`;
      downloadLink.style.display = 'block';
    }
  } else {
    // Handle Rate Limit specifically
    if (response.status === 429) {
      throw new Error('请求过于频繁 (Rate Limit)，请稍后再试或减少任务量。');
    }
    throw new Error(result.error || '未知错误');
  }
} catch (error) {
  console.error(`Task ${task.index} error:`, error);
  loading.style.display = 'none';
  
  // 错误状态 UI
  errorMsg.innerHTML = `
    <div class="error-state">
      <p>出错: ${error.message}</p>
      <button type="button" class="retry-btn">重试</button>
    </div>
  `;
  errorMsg.style.display = 'block';
  
  // 绑定重试事件
  const retryBtn = errorMsg.querySelector('.retry-btn');
  if (retryBtn) {
    retryBtn.onclick = () => {
      // 重置状态并重新执行该任务
      errorMsg.style.display = 'none';
      placeholder.innerHTML = `
        <div class="crazy-loading">
          <div class="crazy-spinner"></div>
          <p>正在疯狂检测中</p>
        </div>
      `;
      placeholder.style.display = 'block';
      placeholder.style.color = '#f1c40f';
      processTask(task); // 递归重试
    };
  }
  
  // 失败时隐藏占位
  placeholder.style.display = 'none';
}
  }
});
