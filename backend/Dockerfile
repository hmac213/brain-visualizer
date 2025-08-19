FROM python:3.12

WORKDIR /app

COPY ./requirements.txt .

RUN pip install -r requirements.txt

# Create pycortex config directory to prevent startup errors
RUN mkdir -p /root/.config/pycortex

COPY . .

EXPOSE 5001

# Set the template path environment variable
ENV CUSTOM_TEMPLATES_PATH=/app/custom_templates

# Install Gunicorn for production WSGI server
RUN pip install gunicorn

# Use Gunicorn for production instead of Flask development server
CMD ["gunicorn", "--bind", "0.0.0.0:5001", "--workers", "4", "--timeout", "120", "--keep-alive", "2", "--preload", "app:app"]