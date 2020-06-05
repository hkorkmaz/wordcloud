package wordcloud.service;

import org.glassfish.jersey.client.ClientConfig;
import org.glassfish.jersey.client.authentication.HttpAuthenticationFeature;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;
import javax.json.JsonArray;
import javax.json.JsonObject;
import javax.json.JsonValue;
import javax.ws.rs.client.ClientBuilder;
import javax.ws.rs.client.Entity;
import javax.ws.rs.client.WebTarget;
import javax.ws.rs.core.Response;

import static javax.ws.rs.core.MediaType.APPLICATION_JSON_TYPE;

@Service
public class ElasticsearchGateway {

    @Value("${elasticsearch.url}")
    private String url;

    @Value("${elasticsearch.user}")
    private String userName;

    @Value("${elasticsearch.password}")
    private String password;

    private WebTarget ws;


    @PostConstruct
    public void setupWsClient(){
        HttpAuthenticationFeature feature = HttpAuthenticationFeature.basicBuilder()
                .nonPreemptive()
                .credentials(userName, password)
                .build();
        ClientConfig clientConfig = new ClientConfig().register(feature);
        this.ws = ClientBuilder.newClient(clientConfig).target(url);
    }

    public void index(JsonArray articles) throws Exception {
        this.deleteIndex();
        this.createMapping();

        articles.stream()
                .map(JsonValue::asJsonObject)
                .forEach((json) -> {
                    String id = json.getString("id");
                    Response response = ws.path(String.format("/wordcloud/_doc/%s", id))
                            .request()
                            .post(Entity.entity(json.toString(), APPLICATION_JSON_TYPE));
                    if(response.getStatus() > 300)
                        throw new RuntimeException(response.readEntity(String.class));
                });
    }

    public JsonObject query(JsonObject query) {
        Response response = ws.path("/wordcloud/_doc/_search")
                .request()
                .post(Entity.entity(query.toString(), APPLICATION_JSON_TYPE));

        if(response.getStatus() < 300)
            return Js.parse(response.readEntity(String.class)).readObject();
        else
            throw new RuntimeException(response.readEntity(String.class));
    }

    public JsonObject upsert(String id, JsonObject object) {
        Response response = ws.path(String.format("/wordcloud/_doc/%s", id))
                .queryParam("refresh", "true")
                .request()
                .put(Entity.entity(object.toString(), APPLICATION_JSON_TYPE));

        if(response.getStatus() < 300)
            return Js.parse(response.readEntity(String.class)).readObject();
        else
            throw new RuntimeException(response.readEntity(String.class));
    }

    public JsonObject delete(String id) {
        Response response = ws.path(String.format("/wordcloud/_doc/%s", id))
                .queryParam("refresh", "true")
                .request()
                .delete();

        if(response.getStatus() < 300)
            return Js.parse(response.readEntity(String.class)).readObject();
        else
            throw new RuntimeException(response.readEntity(String.class));
    }

    private void createMapping() throws Exception {
        JsonObject mapping = Js.fileReader("src/main/resources/mapping.json").readObject();
        Response response = ws.path("/wordcloud").request()
                .put(Entity.entity(mapping.toString(), APPLICATION_JSON_TYPE));
        if(response.getStatus() > 300)
            throw new RuntimeException(response.readEntity(String.class));

    }

    private void deleteIndex() {
       Response response = ws.path("/wordcloud").request().delete();
       if(response.getStatus() > 300)
           throw new RuntimeException(response.readEntity(String.class));
    }
}
