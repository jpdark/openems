package io.openems.impl.controller.api.websocket;

import java.net.InetSocketAddress;
import java.util.concurrent.ConcurrentHashMap;

import org.java_websocket.WebSocket;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.server.WebSocketServer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import io.openems.api.exception.ReflectionException;
import io.openems.api.security.User;
import io.openems.core.utilities.JsonUtils;

public class WebsocketServer extends WebSocketServer {

	private static Logger log = LoggerFactory.getLogger(WebsocketServer.class);
	private final ConcurrentHashMap<WebSocket, WebsocketHandler> sockets = new ConcurrentHashMap<>();

	public WebsocketServer(int port) {
		super(new InetSocketAddress(port));
	}

	@Override public void onClose(WebSocket conn, int code, String reason, boolean remote) {
		log.info("User[" + getUserName(conn) + "]: close connection." //
				+ " Code [" + code + "] Reason [" + reason + "]");
		sockets.remove(conn);
	}

	@Override public void onError(WebSocket conn, Exception ex) {
		log.info("User[" + getUserName(conn) + "]: error on connection. " + ex.getMessage());
	}

	@Override public void onMessage(WebSocket conn, String message) {
		JsonObject j = (new JsonParser()).parse(message).getAsJsonObject();
		WebsocketHandler handler = sockets.get(conn);

		/*
		 * Authenticate user
		 */
		if (j.has("authenticate")) {
			authenticate(j.get("authenticate"), handler);
		}

		/*
		 * Check authentication
		 */
		if (handler.getUser() == null) {
			// no user authenticated till now -> exit
			conn.close();
			return;
		}

		/*
		 * Subscribe to data
		 */
		if (j.has("subscribe")) {
			subscribe(j.get("subscribe"), handler);
		}
	}

	private void authenticate(JsonElement jAuthenticateElement, WebsocketHandler handler) {
		try {
			JsonObject jAuthenticate = JsonUtils.getAsJsonObject(jAuthenticateElement);
			String password = JsonUtils.getAsString(jAuthenticate, "password");
			if (jAuthenticate.has("username")) {
				String username = JsonUtils.getAsString(jAuthenticate, "username");
				handler.setUser(User.authenticate(username, password));
			} else {
				handler.setUser(User.authenticate(password));
			}
		} catch (ReflectionException e) { /* ignore */ }
		if (handler.getUser() != null) {
			log.info("User[" + handler.getUserName() + "]: authenticated.");
		} else {
			log.error("Authentication failed");
		}
	}

	private void subscribe(JsonElement j, WebsocketHandler handler) {
		if (j.isJsonPrimitive() && j.getAsJsonPrimitive().isString()) {
			String tag = j.getAsString();
			handler.addSubscribedChannels(tag);
		}
	}

	@Override public void onOpen(WebSocket conn, ClientHandshake handshake) {
		log.info("Incoming connection...");
		sockets.put(conn, new WebsocketHandler(conn));
	}

	/**
	 * Gets the user name of this user, avoiding null
	 *
	 * @param conn
	 * @return
	 */
	private String getUserName(WebSocket conn) {
		if (conn == null) {
			return "NOT_CONNECTED";
		}
		WebsocketHandler handler = sockets.get(conn);
		if (handler == null) {
			return "NOT_CONNECTED";
		} else {
			return handler.getUserName();
		}
	}
}
