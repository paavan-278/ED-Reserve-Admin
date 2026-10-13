export const formatErrorMessage = (errorData, fallback = "Error occurred") => {
  if (!errorData) {
    return fallback;
  }

  if (Array.isArray(errorData)) {
    const messages = errorData
      .map((error) => {
        if (typeof error === "string") {
          return error;
        }

        if (error && typeof error === "object") {
          return error.msg || error.message || JSON.stringify(error);
        }

        return "";
      })
      .filter(Boolean);

    return messages.length ? messages.join(", ") : fallback;
  }

  if (typeof errorData === "object") {
    return errorData.msg || errorData.message || JSON.stringify(errorData);
  }

  return String(errorData);
};

export const formatAxiosError = (err, fallback = "Error occurred") => {
  if (err?.response?.data) {
    return typeof err.response.data === "object"
      ? JSON.stringify(err.response.data)
      : String(err.response.data);
  }

  return err?.message || fallback;
};
