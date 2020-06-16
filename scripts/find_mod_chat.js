// ==UserScript==
// @name            Youtube Mod Retainer
// @namespace       FlowYoutubeChatScript
// @version         1.7.1
// @description     Youtubeのチャットをニコニコ風に画面上へ流すスクリプトです
// @author          Emubure
// @name:en         Youtube Mod Retainer
// @description:en  Flow the chat on Youtube
// @match           https://www.youtube.com/*
// @require         https://code.jquery.com/jquery-3.3.1.min.js
// @grant           GM_setValue
// @grant           GM_getValue
// @grant           GM_addStyle
// @grant           GM_getResourceText
// @noframes
// ==/UserScript==
(function() {
  // @require         https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/js/toastr.min.js
  // @resource        toastrCSS https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/css/toastr.min.css
  // not-used javascript.

  const HTMLFUNC = {
    getChatField: () => {
      /** Identifies the chat field on the page */
      return document.getElementById('chatframe').contentDocument.querySelector('#items.style-scope.yt-live-chat-item-list-renderer');
    },
  };

  // URL Observer is configured to re-initialize our system
  // upon a page redraw.
  let storedHref = location.href;
  const URLObserver = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (storedHref !== location.href) {
        searchAndInitialize();
        storedHref = location.href;
        log('URL Changed', storedHref, location.href);
      }
    });
  });

  $(document).ready(() => {
    searchAndInitialize();
  });

  let findInterval;
  /**
   * Initializes a observer that checks the chat field.
   */
  function searchAndInitialize() {
    let FindCount = 1;
    clearInterval(findInterval);
    findInterval = setInterval(function() {
      FindCount++;
      if (FindCount > 180) {
        log('The element cannot be found');
        clearInterval(findInterval);
        FindCount = 0;
      }
      if (document.getElementById('chatframe')) {
        if (HTMLFUNC.getChatField() !== null) {
          log('Found the element: ');
          console.log(HTMLFUNC.getChatField());

          initialize();

          clearInterval(findInterval);
          FindCount = 0;
        }
      }
    }, 3000);
  }

  /**
   * Initializes the capture.
   */
  function initialize() {
    // URL監視
    URLObserver.disconnect();
    URLObserver.observe(document, {childList: true, subtree: true});

    // チャット欄監視
    if (HTMLFUNC.getChatField() !== null) {
      ChatFieldObserver.disconnect();
      ChatFieldObserver.observe(HTMLFUNC.getChatField(), {childList: true});
    }
  }

  // ----------------------- Chat analysis -------------------//
  const ChatFieldObserver = new MutationObserver(function(mutations) {
    mutations.forEach(function(e) {
      const addedChats = e.addedNodes;
      for (let i = 0; i < addedChats.length; i++) {
        const commentData = convertChat(addedChats[i]);
        // const commentLaneNum = judgeLaneNum(commentData);

        // if (checkBannedWords(commentData) || checkBannedUsers(commentData)) {
        //   // log('Removed the chat by banned settings')
        //   addedChats[i].style.display='none';
        //   return;
        // }
        // if (SETTINGS.CreateComments) {
        //   createComment(commentData, commentLaneNum);
        // }
        // if (SETTINGS.CreateNGButtons) {
        //   createNGButton(addedChats[i], commentData.authorID);
        // }
        // if (SETTINGS.SimpleChatField) {
        //   simplificationCommentField(addedChats[i]);
        // }
        if (commentData.author.search('Matsuri') >= 0) {
          log(commentData);
        }

        // deleteCommentsOutOfScreen();
        // deleteOldComments();
      }
    });
  });

  /**
   * Converts an added chat item node into an object describing it.
   * @param {object} chat
   * @return {object} output an object describing the chat node.
   */
  function convertChat(chat) {
    const MAX_LENGTH = 400;

    let html = '';
    let length = 0;
    const isMine = false;
    let authorID = null;
    let author = '';

    // チャットの子要素を見ていく
    const children = Array.from(chat.children);
    children.some((_chat) =>{
      const childID = _chat.id;

      // テキストの場合
      if (childID === 'content') {
        // 放送主コメントの場合、色を変更
        if (_chat.querySelector('#author-name').className==='owner style-scope yt-live-chat-author-chip') {
          const color = window.getComputedStyle(_chat.querySelector('#author-name'), null).getPropertyValue('background-color');
          html+='<span style="color: '+color+';font-weight: bold;">';
        } else {
          html+='<span>';
        }

        author = (_chat.querySelector('#author-name')).innerText;

        const text = Array.from(_chat.children).find((v) => v.id === 'message').innerText;
        html += (text.length >= MAX_LENGTH)? text.substr(0, MAX_LENGTH) : text;
        html += '</span>';
        length += text.length;
      }
      // アイコンの場合(アイコンの画像URLはアカウントによって違うためこれでNGユーザー処理が出来そうだ)
      if (childID === 'author-photo') {
        const str = _chat.lastElementChild.getAttribute('src');
        const result = str.split('/');

        // yt3.ggpht.com/【-xxxxxxxxxxx】/AAAAAAAAAAI/AAAAAAAAAAA/【xxxxxxxxxxx】/s32-c-k-no-mo-rj-c0xffffff/photo.jpg
        authorID = result[3]+result[6];
      }
      // スパチャの場合
      if (childID === 'card') {
        /*
        This section is only for analyzing Super Chats, it's useless for us.
        if (_chat.className === 'style-scope yt-live-chat-paid-message-renderer') {
          const header = _chat.children[0];
          const content = _chat.children[1];
          let text = content.children[0].innerText;
          const textColor = window.getComputedStyle(header, null).getPropertyValue('background-color');// 文字の色
          const amountColor = window.getComputedStyle(content, null).getPropertyValue('background-color');// 金額の色
          const authorName = _chat.querySelector('#author-name');
          const paidAmount = _chat.querySelector('#purchase-amount')||_chat.querySelector('#purchase-amount-chip');

          text = (text.length >= MAX_LENGTH)? text.substr(0, MAX_LENGTH) : text;
          html += '<span style="color: '+textColor+';">'+authorName.innerText+': </span>';
          html += '<span style="color: '+textColor+';">'+text+'</span>';
          html += '<span style="color: '+amountColor+'; font-size: smaller;"><strong>'+paidAmount.innerText+'</strong></span>';

          length += text.length + paidAmount.innerText.length;

          authorID = null;
        }
        // ステッカー
        if (_chat.className === 'style-scope yt-live-chat-paid-sticker-renderer') {
          const textColor = window.getComputedStyle(chat, null).getPropertyValue('--yt-live-chat-paid-sticker-chip-background-color');
          const amountColor = window.getComputedStyle(chat, null).getPropertyValue('--yt-live-chat-paid-sticker-background-color');

          // 本当ならステッカーも表示させたいが、srcが取得出来るのはimg要素が出てから0.1秒遅延があり、無理
          // let sticker = _chat.querySelector('#sticker')

          const authorName = _chat.querySelector('#author-name');
          const paidAmount = _chat.querySelector('#purchase-amount')||_chat.querySelector('#purchase-amount-chip');

          html += '<span style="color: '+textColor+';">'+authorName.innerText+': </span>';
          html += '<span style="color: '+amountColor+'; font-size: smaller;"><strong>'+paidAmount.innerText+'</strong></span>';

          length += paidAmount.innerText.length;

          authorID = null;
        }
        */
      }
    });

    // -----------------

    const convertedComment={
      html: html,
      length: length,
      isMine: isMine,
      author: author,
      authorID: authorID,
    };
    return convertedComment;
  }

  function log(mes) {
    console.log('【MYR】'+mes);
  }
})();
