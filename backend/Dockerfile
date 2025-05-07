FROM python:3.12

WORKDIR /app

COPY ./requirements.txt .

RUN pip install -r requirements.txt

COPY . .

EXPOSE 5001

# Set the template path environment variable
ENV CUSTOM_TEMPLATES_PATH=/app/custom_templates

# Use flask run command
CMD ["flask", "--app", "app:app", "run", "--host=0.0.0.0", "--port=5001"]