export default [
  {
    method: "POST",
    path: "/ask",
    handler: "ask.index",
    config: {
      auth: false,
    },
  },
];
