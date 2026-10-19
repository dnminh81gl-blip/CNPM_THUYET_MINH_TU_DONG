package com.tourguide.gateway;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.cloud.gateway.route.Route;
import org.springframework.cloud.gateway.route.RouteLocator;

/** Gateway khoi dong duoc va co du route toi 5 service, dung thu tu uu tien. */
@SpringBootTest
class ApiGatewayApplicationTests {

    @Autowired
    private RouteLocator routeLocator;

    private Map<String, Route> routes() {
        List<Route> list = routeLocator.getRoutes().collectList().block();
        return list.stream().collect(Collectors.toMap(Route::getId, r -> r));
    }

    @Test
    void hasOneRoutePerService() {
        Map<String, Route> routes = routes();
        for (String id : List.of("content-service", "narration-service", "translation-service",
                "tts-service", "notification-service", "translation-test")) {
            assertTrue(routes.containsKey(id), "Thieu route " + id);
        }
    }

    @Test
    void routesPointToTheRightPorts() {
        Map<String, Route> routes = routes();
        assertEquals(8081, routes.get("content-service").getUri().getPort());
        assertEquals(8082, routes.get("narration-service").getUri().getPort());
        assertEquals(8083, routes.get("translation-service").getUri().getPort());
        assertEquals(8084, routes.get("tts-service").getUri().getPort());
        assertEquals(8085, routes.get("notification-service").getUri().getPort());
    }

    @Test
    void specificTranslateTestRouteWinsOverGenericContentTestRoute() {
        Map<String, Route> routes = routes();
        assertTrue(routes.get("translation-test").getOrder() < routes.get("content-service").getOrder());
    }
}
