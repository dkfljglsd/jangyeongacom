(function () {
  if (!sessionStorage.getItem('jya_auth')) {
    const next = encodeURIComponent(location.pathname + location.search);
    location.replace('/login.html?next=' + next);
  }
})();
