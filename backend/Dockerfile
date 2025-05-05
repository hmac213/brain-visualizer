FROM python3

WORKDIR /app

COPY . .

RUN pip install -r requirements.txt

EXPOSE 5001

CMD [ "python3", "-m", "backend.app" ]