// The browser calls /api/... on this site; Next forwards it to the Express server.
module.exports = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: (process.env.API_URL || "http://localhost:4000") + "/api/:path*" }];
  },
};
